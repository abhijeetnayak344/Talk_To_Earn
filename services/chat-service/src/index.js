const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Kafka } = require('kafkajs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true
  }
});

const PORT = process.env.PORT || 3002;

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20
});

// Redis
const redis = new Redis(process.env.REDIS_URL);
const redisPub = new Redis(process.env.REDIS_URL);
const redisSub = new Redis(process.env.REDIS_URL);

// Kafka
const kafka = new Kafka({
  clientId: 'chat-service',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['kafka:9092']
});
const producer = kafka.producer();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'chat-service',
    websocket: 'active',
    timestamp: new Date().toISOString()
  });
});

// WebSocket connection handling
io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);

  // Authenticate
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.emit('error', { message: 'Authentication required' });
    socket.disconnect();
    return;
  }

  // TODO: Verify JWT token
  const userId = socket.handshake.auth.userId; // Extract from verified token

  // Store connection
  await redis.hset('user:connections', userId, socket.id);
  await redis.sadd('online:users', userId);

  // Broadcast user online
  socket.broadcast.emit('user:online', { user_id: userId, is_online: true });

  // Subscribe to user's conversations
  redisSub.subscribe(`user:${userId}:messages`);

  // Handle incoming messages
  socket.on('message:send', async (data) => {
    try {
      const { conversation_id, content, message_type, reply_to_message_id } = data;

      // Save message to database
      const result = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to_message_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, conversation_id, sender_id, content, message_type, created_at`,
        [conversation_id, userId, content, message_type || 'text', reply_to_message_id]
      );

      const message = result.rows[0];

      // Acknowledge to sender
      socket.emit('message:ack', {
        client_message_id: data.client_message_id,
        message_id: message.id,
        created_at: message.created_at
      });

      // Get conversation members
      const members = await pool.query(
        `SELECT user_id FROM conversation_members 
         WHERE conversation_id = $1 AND user_id != $2 AND left_at IS NULL`,
        [conversation_id, userId]
      );

      // Publish to Redis for other instances
      await redisPub.publish('chat:messages', JSON.stringify({
        conversation_id,
        message,
        recipient_ids: members.rows.map(m => m.user_id)
      }));

      // Emit to recipients via WebSocket
      for (const member of members.rows) {
        const recipientSocketId = await redis.hget('user:connections', member.user_id);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('message:new', { message });
        }
      }

      // Send to Kafka for engagement analysis
      await producer.send({
        topic: 'message.sent',
        messages: [{
          key: message.id,
          value: JSON.stringify({
            message_id: message.id,
            user_id: userId,
            conversation_id,
            content,
            message_type,
            created_at: message.created_at
          })
        }]
      });

      console.log('Message sent:', message.id);

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing:start', async (data) => {
    const { conversation_id } = data;
    socket.to(conversation_id).emit('typing:user', {
      conversation_id,
      user_id: userId,
      is_typing: true
    });
    
    // Set expiry in Redis
    await redis.setex(`typing:${conversation_id}:${userId}`, 5, '1');
  });

  socket.on('typing:stop', (data) => {
    const { conversation_id } = data;
    socket.to(conversation_id).emit('typing:user', {
      conversation_id,
      user_id: userId,
      is_typing: false
    });
  });

  // Handle message read
  socket.on('message:read', async (data) => {
    const { conversation_id, message_id } = data;
    
    await pool.query(
      `INSERT INTO message_delivery (message_id, user_id, read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = NOW()`,
      [message_id, userId]
    );

    // Update conversation members
    await pool.query(
      `UPDATE conversation_members 
       SET last_read_at = NOW() 
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversation_id, userId]
    );
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    
    await redis.hdel('user:connections', userId);
    await redis.srem('online:users', userId);
    
    // Update database
    await pool.query(
      `UPDATE users SET is_online = false, last_seen_at = NOW() WHERE id = $1`,
      [userId]
    );

    socket.broadcast.emit('user:offline', { user_id: userId, is_online: false });
  });
});

// Subscribe to Redis pub/sub for cross-instance communication
redisSub.on('message', (channel, message) => {
  if (channel === 'chat:messages') {
    const data = JSON.parse(message);
    // Handle messages from other instances
    // Already handled in message:send
  }
});

// REST API endpoints
app.get('/api/conversations', async (req, res) => {
  // TODO: Get user conversations
  res.json({ message: 'Get conversations endpoint' });
});

app.get('/api/conversations/:id/messages', async (req, res) => {
  // TODO: Get conversation messages
  res.json({ message: 'Get messages endpoint' });
});

// Start server
async function start() {
  try {
    // Connect to Kafka producer
    await producer.connect();
    console.log('Kafka producer connected');

    // Test database
    await pool.query('SELECT NOW()');
    console.log('Database connected');

    // Test Redis
    await redis.ping();
    console.log('Redis connected');

    server.listen(PORT, () => {
      console.log(`Chat service running on port ${PORT}`);
      console.log(`WebSocket server active`);
    });
  } catch (error) {
    console.error('Failed to start chat service:', error);
    process.exit(1);
  }
}

start();
