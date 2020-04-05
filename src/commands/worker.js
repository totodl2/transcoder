const path = require('path');
const debug = require('debug')('workers/songs');
const { queue } = require('../queues/transco/index');
const events = require('../queues/transco/events');

module.exports = () => {
  const processArgs = process.argv.filter(
    arg => arg.substr(0, 9) === '--process',
  );

  const processes = processArgs.length
    ? parseInt(processArgs[0].split('=')[1], 10)
    : 1;

  Object.entries(events).forEach(([event, callback]) =>
    queue.on(event, callback),
  );

  return new Promise(resolve => {
    queue.process(
      processes,
      path.join(__dirname, '../queues/transco/processor.js'),
    );

    process.on('exit', () => {
      debug('Terminating workers...');
      resolve();
    });
  });
};
