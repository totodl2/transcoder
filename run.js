require('dotenv').config();
require('./src/sentry');

const { exec: oldExec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const exec = util.promisify(oldExec);
const { argv } = process;

function help() {
  const commands = fs
    .readdirSync(path.join(__dirname, 'src/commands/'))
    .filter(file => file.indexOf('.') !== 0 && file.slice(-3) === '.js')
    .map(file => path.basename(file, path.extname(file)));

  /* eslint-disable-next-line */
  console.log(` 
  Usage : node run.js <command> <...> [--exit]
  Commands : ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

if (argv.includes('--help') || argv.length <= 2) {
  help();
}

const commandFile = path.join(__dirname, 'src/commands', `${argv[2]}.js`);
if (!fs.existsSync(commandFile)) {
  console.log(`Command ${argv[2]} not found`); // eslint-disable-line
  help();
}

(async function() {
  await exec(`node "${path.join(__dirname, 'warmup.js')}"`);

  /* eslint-disable-next-line */
  const command = require(commandFile);
  return command();
})()
  .catch(e => {
    console.log(e); // eslint-disable-line
    process.exit(1);
  })
  .finally(() => {
    if (argv.includes('--exit')) {
      process.exit(0);
    }
  });
