const gst = require('node-gstreamer-tools');
const axios = require('axios');

const debug = require('../../debug')('transco');
const {
  setActive,
  isCancelled,
  remove,
} = require('../../services/workerStatus');
const canTranscode = require('../../services/canTranscode');
const createPipeline = require('../../services/createPipeline');
const presets = require('../../presets');

// 10m job timeout
const TIMEOUT = 10 * 60 * 1000;

module.exports = async job => {
  const {
    data: { id, media: mediaUrl, output: outputLocation, end: endLocation },
  } = job;

  if (await isCancelled(id)) {
    return 'Cancelled';
  }

  await setActive(id);

  const media = await gst.discover(mediaUrl);
  if (!canTranscode(media.topology, presets.constraints)) {
    return 'Unsupported media';
  }

  const { pipeline, output } = createPipeline({
    filepath: mediaUrl,
    output: outputLocation,
    media,
    conf: presets,
  });

  debug(pipeline.asArray().join(' '));

  let transcoOutput = null;
  let lastSeen = Date.now();
  try {
    transcoOutput = await new Promise((resolve, reject) => {
      const process = pipeline.execute({ debug: true, args: ['-e', '-t'] });
      let stderr = '';
      let cancelled = false;
      let stdout = '';

      const watchStatus = setInterval(async () => {
        const now = Date.now();
        cancelled = await isCancelled(id);
        if (cancelled || now > lastSeen + TIMEOUT) {
          debug('Cancelled %o', id);
          process.kill('SIGKILL');
        }
      }, 1000);

      process.stderr.on('data', data => {
        stderr += data.toString();
      });

      process.stdout.on('data', async data => {
        lastSeen = Date.now();
        const sData = data.toString();
        const match = sData.match(/.* \(\s*([0-9.]+)\s*%\)/im);
        if (match) {
          job.progress(parseInt(match[1], 10));
        } else {
          stdout += sData;
        }
      });

      process.on('close', code => {
        clearInterval(watchStatus);
        debug('Process exited with code %o (killed %o)', code, process.killed);

        if (code !== 0 || process.killed) {
          const now = Date.now();
          reject(
            new Error(`
              ${cancelled ? 'Job cancelled' : ''}
              Now: ${now}, lastSeen: ${lastSeen}, diff: ${now - lastSeen}
              Command: ${pipeline.asArray().join(' ')}
              stderr: ${stderr}
              stdout: ${stdout}
            `),
          );
          return;
        }

        resolve(stdout);
      });
    });
  } catch (e) {
    if (!(await isCancelled(id))) {
      throw e;
    }
    transcoOutput = e.message;
  }

  const cancelled = await isCancelled(id);
  await remove(id);

  if (endLocation) {
    await axios({
      method: 'POST',
      timeout: 5000,
      url: `${endLocation}${
        endLocation.indexOf('?') !== -1 ? '&' : '?'
      }cancelled=${cancelled ? 1 : 0}`,
      data: output,
    });
  }

  return `${pipeline.asArray().join(' ')}\n${transcoOutput}\n${JSON.stringify(
    output,
    null,
    2,
  )}`;
};
