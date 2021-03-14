const warmPluginCache = require('./src/services/gstPlugins/warmPluginsCache');

if (warmPluginCache(process.argv.includes('--force'))) {
  console.log('Plugins cache generated');
}
