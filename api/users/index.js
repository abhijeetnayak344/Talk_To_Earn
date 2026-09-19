const { query } = require('../../lib/db');
const { verifyAuth } = require('../../lib/auth');

// Main handler for users endpoints
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const path = req.url.split('?')[0];
  const pathParts = path.split('/').filter(p => p);

  try {
    // GET /api/users/search
    if (path === '/api/users/search' && req.method === 'GET') {
      return await verifyAuth(searchUsers)(req, res);
    }
    // GET /api/users/:userId
    else if (pathParts.length === 3 && req.method === 'GET') {
      const userId = pathParts[2];
      return await verifyAuth((req, res) => getUserProfile(req, res, userId))(req, res);
    }
    // PUT /api/users/:userId
    else if (pathParts.length === 3 && req.method === 'PUT') {
      const userId = pathParts[2];
      return await verifyAuth((req, res) => updateUserProfile(req, res, userId))(req, res);
    }
    // POST /api/users/:userId/block
    else if (pathParts.length === 4 && pathParts[3] === 'block' && req.method === 'POST') {
      const userId = pathParts[2];
      return await verifyAuth((req, res) => blockUser(req, res, userId))(req, res);
    }
    // DELETE /api/users/:userId/block
    else if (pathParts.length === 4 && pathParts[3] === 'block' && req.method === 'DELETE') {
      const userId = pathParts[2];
      return await verifyAuth((req, res) => unblockUser(req, res, userId))(req, res);
    }
    else {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found'
        }
      });
    }
  } catch (error) {
    console.error('Users API error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

async function getUserProfile(req, res, userId) {
  const result = await query(
    `SELECT u.id, u.username, u.display_name, u.profile_photo_url,
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

  res.json({
    success: true,
    data: { user: result.rows[0] }
  });
}

async function updateUserProfile(req, res, userId) {
  if (userId !== req.user.userId) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Cannot update other users profile' }
    });
  }

  const { display_name, bio, status_message } = req.body;

  const result = await query(
    `UPDATE users 
     SET display_name = COALESCE($1, display_name),
         status_message = COALESCE($2, status_message),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, username, display_name, status_message, profile_photo_url`,
    [display_name, status_message, userId]
  );

  res.json({
    success: true,
    data: { user: result.rows[0] }
  });
}

async function searchUsers(req, res) {
  const { q, limit = 20 } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Search query must be at least 2 characters' }
    });
  }

  const result = await query(
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
}

async function blockUser(req, res, userId) {
  const blockerId = req.user.userId;
  const { reason } = req.body;

  await query(
    `INSERT INTO blocks (blocker_id, blocked_id, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
    [blockerId, userId, reason]
  );

  res.status(201).json({
    success: true,
    message: 'User blocked successfully'
  });
}

async function unblockUser(req, res, userId) {
  const blockerId = req.user.userId;

  await query(
    `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, userId]
  );

  res.status(204).end();
}
