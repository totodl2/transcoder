const axios = require('axios');
const status = require('../../services/workerStatus');

module.exports = {
  removed: async job => {
    const {
      data: { id },
    } = job;

    await status.remove(id);
  },
  failed: async job => {
    const {
      data: { progress },
      id: jobId,
    } = job;

    if (!progress) {
      return;
    }

    await axios({
      method: 'POST',
      timeout: 30000,
      url: progress,
      data: {
        status: 'failed',
        job: jobId,
      },
    });
  },
};
