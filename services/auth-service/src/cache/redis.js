const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

async function connectRedis() {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis connection error:', error);
  });

  return redisClient;
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redisClient;
}

module.exports = {
  connectRedis,
  getRedisClient
};
