const plugins = require('./gstools-plugins');
const details = require('./gstools-plugins-details');

module.exports = {
  getPlugins: () => plugins,
  inspect: plugin => {
    if (details[plugin]) {
      return details[plugin];
    }
    return null;
  },
};
