const arena = require('bull-arena');
const { config: transcoConfig } = require('../queues/transco');

module.exports = async () => {
  const port = process.env.ARENA_PORT || 3000;
  const host = process.env.ARENA_HOST || '0.0.0.0';
  arena({ queues: [transcoConfig] }, { port, host });
};
