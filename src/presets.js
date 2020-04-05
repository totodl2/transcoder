const fs = require('fs');

module.exports = JSON.parse(fs.readFileSync(process.env.PRESET_FILE));
