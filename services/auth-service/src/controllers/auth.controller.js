const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/connection');
const { getRedisClient } = require('../cache/redis');
const logger = require('../utils/logger');

// Register new user
async function register(req, res, next) {
  try {
    const { username, email, phone_number, password, display_name } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required'
        }
      });
    }

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2 OR phone_number = $3',
      [username, email, phone_number]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this username, email, or phone already exists'
        }
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(
      `INSERT INTO users (username, email, phone_number, password_hash, display_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, phone_number, display_name, created_at`,
      [username, email, phone_number, passwordHash, display_name || username]
    );

    const user = result.rows[0];

    // Create point account
    await query(
      `INSERT INTO point_accounts (user_id, account_type) VALUES ($1, 'personal')`,
      [user.id]
    );

    logger.info('User registered successfully', { userId: user.id, username });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone_number: user.phone_number,
          display_name: user.display_name,
          phone_verified: false,
          email_verified: false,
          created_at: user.created_at
        },
        verification_required: true
      },
      message: 'Registration successful. Please verify your phone number.'
    });

  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
}

// Login user
async function login(req, res, next) {
  try {
    const { identifier, password, device_info } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username/email and password are required'
        }
      });
    }

    // Find user
    const result = await query(
      `SELECT id, username, email, password_hash, display_name, profile_photo_url,
              account_status, is_online
       FROM users
       WHERE username = $1 OR email = $1 OR phone_number = $1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
    }

    const user = result.rows[0];

    // Check account status
    if (user.account_status !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: `Account is ${user.account_status}`
        }
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    // Store refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await query(
      `INSERT INTO auth_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, tokenHash]
    );

    // Update last seen
    await query(
      `UPDATE users SET is_online = true, last_seen_at = NOW() WHERE id = $1`,
      [user.id]
    );

    // Cache user session in Redis
    const redis = getRedisClient();
    await redis.setex(`session:${user.id}`, 900, JSON.stringify({
      userId: user.id,
      username: user.username
    }));

    logger.info('User logged in', { userId: user.id, username: user.username });

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900,
        token_type: 'Bearer',
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          profile_photo_url: user.profile_photo_url,
          is_online: true
        }
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
}

// Refresh access token
async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required'
        }
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    // Generate new refresh token (rotation)
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    // Invalidate old refresh token and store new one
    const tokenHash = await bcrypt.hash(newRefreshToken, 10);
    await query(
      `UPDATE auth_tokens SET is_revoked = true WHERE user_id = $1 AND is_revoked = false`,
      [decoded.userId]
    );
    await query(
      `INSERT INTO auth_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [decoded.userId, tokenHash]
    );

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 900
      }
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    next(error);
  }
}

// Logout
async function logout(req, res, next) {
  try {
    const userId = req.user.userId;
    const { all_devices } = req.body;

    // Revoke tokens
    if (all_devices) {
      await query(
        `UPDATE auth_tokens SET is_revoked = true WHERE user_id = $1`,
        [userId]
      );
    }

    // Update user status
    await query(
      `UPDATE users SET is_online = false, last_seen_at = NOW() WHERE id = $1`,
      [userId]
    );

    // Clear Redis session
    const redis = getRedisClient();
    await redis.del(`session:${userId}`);

    logger.info('User logged out', { userId, allDevices: all_devices });

    res.status(204).send();

  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout
};
