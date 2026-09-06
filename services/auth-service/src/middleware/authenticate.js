const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../cache/redis');
const logger = require('../utils/logger');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    // Check Redis session (optional but recommended)
    const redis = getRedisClient();
    const session = await redis.get(`session:${decoded.userId}`);
    
    if (!session) {
      logger.warn('Session not found in Redis', { userId: decoded.userId });
      // Continue anyway - Redis might have expired
    }

    // Attach user to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username
    };

    next();

  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed'
      }
    });
  }
}

module.exports = authenticate;
