const Queue = require('bull');
const config = require('./config');

module.exports = new Queue(config.name, {
  redis: config.redis,
  defaultJobOptions: {
    attempts: 1,
    backoff: 30 * 60 * 1000, // 30min
    lifo: true,
  },
});
