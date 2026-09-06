const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20
});

// Redis
const redis = new Redis(process.env.REDIS_URL);

// Kafka
const kafka = new Kafka({
  clientId: 'reward-service',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['kafka:9092']
});
const consumer = kafka.consumer({ groupId: 'reward-service-group' });
const producer = kafka.producer();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'reward-service',
    timestamp: new Date().toISOString()
  });
});

// Get point balance
app.get('/api/points/balance', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']; // From API Gateway after auth

    const result = await pool.query(
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
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch balance' }
    });
  }
});

// Get transaction history
app.get('/api/points/transactions', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get account
    const accountResult = await pool.query(
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

    // Get transactions
    const result = await pool.query(
      `SELECT id, amount, transaction_type, description, balance_after, created_at
       FROM point_transactions
       WHERE account_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
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
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch transactions' }
    });
  }
});

// Award points (internal - called by Kafka consumer)
async function awardPoints(userId, amount, eventId, eventType, metadata = {}) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get account with lock
    const accountResult = await client.query(
      `SELECT id, balance, daily_earned_today, daily_limit, last_daily_reset
       FROM point_accounts
       WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Point account not found');
    }

    const account = accountResult.rows[0];

    // Check if daily reset needed
    const today = new Date().toISOString().split('T')[0];
    const lastReset = account.last_daily_reset?.toISOString().split('T')[0];
    
    let dailyEarned = account.daily_earned_today;
    if (today !== lastReset) {
      dailyEarned = 0;
    }

    // Check daily limit
    if (dailyEarned + amount > account.daily_limit) {
      const allowedAmount = Math.max(0, account.daily_limit - dailyEarned);
      amount = allowedAmount;
      
      if (amount === 0) {
        await client.query('ROLLBACK');
        console.log(`Daily limit reached for user ${userId}`);
        return { success: false, reason: 'Daily limit reached' };
      }
    }

    // Insert transaction (idempotency via unique event_id)
    try {
      await client.query(
        `INSERT INTO point_transactions 
         (account_id, user_id, amount, transaction_type, event_id, event_type, 
          description, balance_after, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          account.id,
          userId,
          amount,
          'earned',
          eventId,
          eventType,
          metadata.reason || 'Points earned',
          account.balance + amount,
          JSON.stringify(metadata)
        ]
      );
    } catch (error) {
      if (error.code === '23505') {
        // Unique violation - already processed
        await client.query('ROLLBACK');
        console.log(`Event ${eventId} already processed`);
        return { success: false, reason: 'Already processed' };
      }
      throw error;
    }

    // Update account
    await client.query(
      `UPDATE point_accounts
       SET balance = balance + $1,
           lifetime_earned = lifetime_earned + $1,
           daily_earned_today = $2,
           last_daily_reset = CURRENT_DATE
       WHERE id = $3`,
      [amount, dailyEarned + amount, account.id]
    );

    await client.query('COMMIT');

    // Clear cache
    await redis.del(`points:balance:${userId}`);

    // Emit event
    await producer.send({
      topic: 'points.awarded',
      messages: [{
        key: userId,
        value: JSON.stringify({
          user_id: userId,
          amount,
          new_balance: account.balance + amount,
          event_type: eventType,
          reason: metadata.reason
        })
      }]
    });

    console.log(`Awarded ${amount} points to user ${userId}`);
    return { success: true, amount, newBalance: account.balance + amount };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error awarding points:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Kafka consumer for engagement events
async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'engagement.calculated', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        
        console.log('Processing engagement event:', event);

        const { user_id, points, event_id, event_type, reason, metadata } = event;

        if (points > 0) {
          await awardPoints(user_id, points, event_id, event_type, {
            reason,
            ...metadata
          });
        }

      } catch (error) {
        console.error('Error processing Kafka message:', error);
      }
    }
  });

  console.log('Reward service consumer started');
}

// Start server
async function start() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connected');

    await redis.ping();
    console.log('Redis connected');

    await producer.connect();
    console.log('Kafka producer connected');

    await startConsumer();

    app.listen(PORT, () => {
      console.log(`Reward service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start reward service:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
