const { query } = require('../../lib/db');
const { verifyAuth } = require('../../lib/auth');

// Main handler for rewards endpoints
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

  try {
    if (path === '/api/rewards/balance' && req.method === 'GET') {
      return await verifyAuth(getBalance)(req, res);
    } else if (path === '/api/rewards/transactions' && req.method === 'GET') {
      return await verifyAuth(getTransactions)(req, res);
    } else if (path === '/api/rewards' && req.method === 'GET') {
      return await verifyAuth(getRewards)(req, res);
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found'
        }
      });
    }
  } catch (error) {
    console.error('Rewards API error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

async function getBalance(req, res) {
  const userId = req.user.userId;

  const result = await query(
    `SELECT balance, lifetime_earned, lifetime_spent, daily_earned_today, daily_limit
     FROM point_accounts WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Point account not found' }
    });
  }

  const account = result.rows[0];

  res.json({
    success: true,
    data: {
      personal: {
        balance: account.balance,
        lifetime_earned: account.lifetime_earned,
        lifetime_spent: account.lifetime_spent,
        daily_earned_today: account.daily_earned_today,
        daily_limit: account.daily_limit
      }
    }
  });
}

async function getTransactions(req, res) {
  const userId = req.user.userId;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const accountResult = await query(
    `SELECT id FROM point_accounts WHERE user_id = $1`,
    [userId]
  );

  if (accountResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Point account not found' }
    });
  }

  const accountId = accountResult.rows[0].id;

  const result = await query(
    `SELECT id, amount, transaction_type, description, balance_after, created_at
     FROM point_transactions
     WHERE account_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM point_transactions WHERE account_id = $1`,
    [accountId]
  );

  const total = parseInt(countResult.rows[0].count);

  res.json({
    success: true,
    data: {
      transactions: result.rows
    },
    pagination: {
      current_page: parseInt(page),
      per_page: parseInt(limit),
      total,
      total_pages: Math.ceil(total / limit)
    }
  });
}

async function getRewards(req, res) {
  const { type = 'personal', category } = req.query;

  let queryText = `SELECT id, name, description, category, reward_type, points_required, image_url, partner_name
     FROM rewards
     WHERE reward_type = $1 AND is_active = true`;
  
  const params = [type];

  if (category) {
    queryText += ` AND category = $2`;
    params.push(category);
  }

  queryText += ` ORDER BY display_order, points_required`;

  const result = await query(queryText, params);

  res.json({
    success: true,
    data: {
      rewards: result.rows
    }
  });
}
