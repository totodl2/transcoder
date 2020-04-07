const gst = require('node-gstreamer-tools');
const path = require('path');
const fs = require('fs');

const cacheFile = path.join(__dirname, './cache.json');

/**
 * This is used due to a bug with nvidia l4t plugins.
 * When introspecting all plugins it leak something and we can't use gst-launch
 * after.
 */

module.exports = force => {
  if (fs.existsSync(cacheFile) && !force) {
    return;
  }

  const systemPluginsList = gst.getPlugins();
  const systemPlugins = systemPluginsList.map(plugin => gst.inspect(plugin));

  const systemFeatures = systemPlugins.reduce(
    (prev, { features: featuresList = [], ...plugin }) => [
      ...prev,
      ...featuresList.map(({ klass, ...feature }) => ({
        klass: (klass || '').toLowerCase().split('/'),
        ...feature,
        plugin,
      })),
    ],
    [],
  );

  fs.writeFileSync(
    cacheFile,
    JSON.stringify({
      systemPlugins,
      systemFeatures,
    }),
    { encoding: 'UTF-8' },
  );
};
