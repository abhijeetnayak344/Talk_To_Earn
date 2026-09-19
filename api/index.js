// Main API entry point for Vercel deployment
module.exports = (req, res) => {
  res.json({
    name: 'Talk to Earn API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      messages: '/api/messages',
      rewards: '/api/rewards'
    },
    deployment: 'vercel',
    documentation: 'https://github.com/yourusername/talk-to-earn'
  });
};
