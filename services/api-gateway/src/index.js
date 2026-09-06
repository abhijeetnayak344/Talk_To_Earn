const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Talk to Earn API Gateway',
    version: '1.0.0',
    documentation: '/docs',
    services: {
      auth: '/api/auth',
      users: '/api/users',
      conversations: '/api/conversations',
      groups: '/api/groups',
      couples: '/api/couples',
      calls: '/api/calls',
      statuses: '/api/statuses',
      points: '/api/points',
      rewards: '/api/rewards',
      notifications: '/api/notifications'
    }
  });
});

// Proxy configuration
const proxyOptions = {
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable'
      }
    });
  }
};

// Route to services
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  ...proxyOptions
}));

app.use('/api/users', createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://user-service:3003',
  ...proxyOptions
}));

app.use('/api/conversations', createProxyMiddleware({
  target: process.env.CHAT_SERVICE_URL || 'http://chat-service:3002',
  ...proxyOptions
}));

app.use('/api/messages', createProxyMiddleware({
  target: process.env.CHAT_SERVICE_URL || 'http://chat-service:3002',
  ...proxyOptions
}));

app.use('/api/groups', createProxyMiddleware({
  target: process.env.CHAT_SERVICE_URL || 'http://chat-service:3002',
  ...proxyOptions
}));

app.use('/api/couples', createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://user-service:3003',
  ...proxyOptions
}));

app.use('/api/points', createProxyMiddleware({
  target: process.env.REWARD_SERVICE_URL || 'http://reward-service:3004',
  ...proxyOptions
}));

app.use('/api/rewards', createProxyMiddleware({
  target: process.env.REWARD_SERVICE_URL || 'http://reward-service:3004',
  ...proxyOptions
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
