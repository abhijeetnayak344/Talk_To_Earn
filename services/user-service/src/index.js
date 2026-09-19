const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const Redis = require('ioredis');
const AWS = require('aws-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20
});

// Redis
const redis = new Redis(process.env.REDIS_URL);

// S3 Configuration (MinIO)
const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

// Get user profile
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.headers['x-user-id'];

    // Check cache first
    const cached = await redis.get(`user:profile:${userId}`);
    if (cached) {
      return res.json({
        success: true,
        data: { user: JSON.parse(cached) },
        cached: true
      });
    }

    // Get from database
    const result = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.profile_photo_url,
              u.status_message, u.is_online, u.last_seen_at, u.created_at,
              pa.balance as points_balance
       FROM users u
       LEFT JOIN point_accounts pa ON pa.user_id = u.id
       WHERE u.id = $1 AND u.account_status = 'active'`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    const user = result.rows[0];

    // Get stats
    const statsResult = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM messages WHERE sender_id = $1) as messages_sent,
        (SELECT COUNT(*) FROM engagement_events WHERE user_id = $1) as total_interactions
       FROM users WHERE id = $1`,
      [userId]
    );

    const profile = {
      ...user,
      stats: statsResult.rows[0]
    };

    // Cache for 5 minutes
    await redis.setex(`user:profile:${userId}`, 300, JSON.stringify(profile));

    res.json({
      success: true,
      data: { user: profile }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' }
    });
  }
});

// Update user profile
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.headers['x-user-id'];

    // Verify user can only update their own profile
    if (userId !== requesterId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot update other users profile' }
      });
    }

    const { display_name, bio, status_message } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET display_name = COALESCE($1, display_name),
           bio = COALESCE($2, bio),
           status_message = COALESCE($3, status_message),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, username, display_name, bio, status_message, profile_photo_url`,
      [display_name, bio, status_message, userId]
    );

    // Invalidate cache
    await redis.del(`user:profile:${userId}`);

    res.json({
      success: true,
      data: { user: result.rows[0] }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' }
    });
  }
});

// Search users
app.get('/api/users/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Search query must be at least 2 characters' }
      });
    }

    const result = await pool.query(
      `SELECT id, username, display_name, profile_photo_url, is_online
       FROM users
       WHERE (username ILIKE $1 OR display_name ILIKE $1)
         AND account_status = 'active'
       LIMIT $2`,
      [`%${q}%`, limit]
    );

    res.json({
      success: true,
      data: { users: result.rows }
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Search failed' }
    });
  }
});

// Block user
app.post('/api/users/:userId/block', async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.headers['x-user-id'];
    const { reason } = req.body;

    await pool.query(
      `INSERT INTO blocks (blocker_id, blocked_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [blockerId, userId, reason]
    );

    res.status(201).json({
      success: true,
      message: 'User blocked successfully'
    });

  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to block user' }
    });
  }
});

// Unblock user
app.delete('/api/users/:userId/block', async (req, res) => {
  try {
    const { userId } = req.params;
    const blockerId = req.headers['x-user-id'];

    await pool.query(
      `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, userId]
    );

    res.status(204).send();

  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to unblock user' }
    });
  }
});

// Report user
app.post('/api/users/:userId/report', async (req, res) => {
  try {
    const { userId } = req.params;
    const reporterId = req.headers['x-user-id'];
    const { report_type, reason } = req.body;

    const result = await pool.query(
      `INSERT INTO reports (reporter_id, reported_user_id, report_type, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, status`,
      [reporterId, userId, report_type, reason]
    );

    res.status(201).json({
      success: true,
      data: {
        report_id: result.rows[0].id,
        status: result.rows[0].status
      },
      message: 'Report submitted successfully'
    });

  } catch (error) {
    console.error('Error reporting user:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit report' }
    });
  }
});

// Get user settings
app.get('/api/users/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.headers['x-user-id'];

    if (userId !== requesterId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot access other users settings' }
      });
    }

    const result = await pool.query(
      `SELECT privacy_settings, notification_settings
       FROM user_profiles
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      await pool.query(
        `INSERT INTO user_profiles (user_id) VALUES ($1)`,
        [userId]
      );

      return res.json({
        success: true,
        data: {
          privacy: {
            profile_photo: 'everyone',
            last_seen: 'everyone',
            status: 'everyone',
            online_status: 'everyone',
            read_receipts: true
          },
          notifications: {
            push_notifications: true,
            message_notifications: true,
            call_notifications: true,
            email_notifications: true
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        privacy: result.rows[0].privacy_settings,
        notifications: result.rows[0].notification_settings
      }
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch settings' }
    });
  }
});

// Update user settings
app.put('/api/users/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.headers['x-user-id'];

    if (userId !== requesterId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot update other users settings' }
      });
    }

    const { privacy, notifications } = req.body;

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (privacy) {
      updates.push(`privacy_settings = privacy_settings || $${paramCount}::jsonb`);
      values.push(JSON.stringify(privacy));
      paramCount++;
    }

    if (notifications) {
      updates.push(`notification_settings = notification_settings || $${paramCount}::jsonb`);
      values.push(JSON.stringify(notifications));
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No settings provided' }
      });
    }

    values.push(userId);

    await pool.query(
      `UPDATE user_profiles
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE user_id = $${paramCount}`,
      values
    );

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' }
    });
  }
});

// Couple endpoints
app.post('/api/couples/invite', async (req, res) => {
  try {
    const fromUserId = req.headers['x-user-id'];
    const { to_user_id, message } = req.body;

    // Check if already in a couple
    const existingCouple = await pool.query(
      `SELECT id FROM couples 
       WHERE (user_a_id = $1 OR user_b_id = $1) AND status = 'active'`,
      [fromUserId]
    );

    if (existingCouple.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_IN_COUPLE', message: 'Already in an active couple' }
      });
    }

    // Create invite
    const result = await pool.query(
      `INSERT INTO couple_invites (from_user_id, to_user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, from_user_id, to_user_id, status, created_at`,
      [fromUserId, to_user_id, message]
    );

    res.status(201).json({
      success: true,
      data: { invite: result.rows[0] }
    });

  } catch (error) {
    console.error('Error creating couple invite:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create invite' }
    });
  }
});

app.get('/api/couples/invites', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    const received = await pool.query(
      `SELECT ci.id, ci.from_user_id, ci.message, ci.status, ci.created_at,
              u.username, u.display_name, u.profile_photo_url
       FROM couple_invites ci
       JOIN users u ON u.id = ci.from_user_id
       WHERE ci.to_user_id = $1 AND ci.status = 'pending'`,
      [userId]
    );

    const sent = await pool.query(
      `SELECT ci.id, ci.to_user_id, ci.message, ci.status, ci.created_at,
              u.username, u.display_name, u.profile_photo_url
       FROM couple_invites ci
       JOIN users u ON u.id = ci.to_user_id
       WHERE ci.from_user_id = $1 AND ci.status = 'pending'`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        received: received.rows,
        sent: sent.rows
      }
    });

  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch invites' }
    });
  }
});

app.post('/api/couples/invites/:inviteId/respond', async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.headers['x-user-id'];
    const { action } = req.body; // accept or reject

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get invite
      const inviteResult = await client.query(
        `SELECT from_user_id, to_user_id FROM couple_invites 
         WHERE id = $1 AND to_user_id = $2 AND status = 'pending'
         FOR UPDATE`,
        [inviteId, userId]
      );

      if (inviteResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invite not found' }
        });
      }

      const invite = inviteResult.rows[0];

      if (action === 'accept') {
        // Create couple
        const coupleResult = await client.query(
          `INSERT INTO couples (user_a_id, user_b_id, status)
           VALUES ($1, $2, 'active')
           RETURNING id`,
          [invite.from_user_id, invite.to_user_id]
        );

        const coupleId = coupleResult.rows[0].id;

        // Create couple point account
        await client.query(
          `INSERT INTO point_accounts (couple_id, account_type)
           VALUES ($1, 'couple')`,
          [coupleId]
        );

        // Update invite
        await client.query(
          `UPDATE couple_invites SET status = 'accepted', responded_at = NOW()
           WHERE id = $1`,
          [inviteId]
        );

        await client.query('COMMIT');

        res.json({
          success: true,
          data: { couple_id: coupleId },
          message: 'Couple created successfully'
        });

      } else if (action === 'reject') {
        await client.query(
          `UPDATE couple_invites SET status = 'rejected', responded_at = NOW()
           WHERE id = $1`,
          [inviteId]
        );

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Invite rejected'
        });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error responding to invite:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to respond to invite' }
    });
  }
});

// Start server
async function start() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected');

    await redis.ping();
    console.log('Redis connected');

    app.listen(PORT, () => {
      console.log(`User service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start user service:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
