const compareCap = require('./compareCap');
const { systemFeatures, DIRECTIONS } = require('./plugins');

const ALL_DIRECTIONS = Object.values(DIRECTIONS);

const validateCapabilities = (padCaps, neededCaps) => {
  const results = Object.entries(neededCaps).map(([name, cap]) => {
    if (padCaps[name] === undefined) {
      return true;
    }

    return compareCap(padCaps[name], cap);
  });

  return !results.includes(false);
};

const rankSort = (a, b) => b.rank - a.rank;

/**
 * @param {string} mimetype
 * @param {Number[]>} directions
 * @param {string[]} klass needed for the feature
 * @param {boolean} includesAnyPads if we search pads with value any: true
 * @param {object} caps
 * @param {string[]} allowedPlugins
 * @returns {object[]}
 */
const findFeaturesFor = (
  {
    mimetype,
    directions = ALL_DIRECTIONS,
    klasses = [],
    includesAnyPads = false,
    caps = {},
    allowedPlugins = [],
  },
  features = systemFeatures,
) =>
  features
    .filter(feature => {
      if (
        (allowedPlugins.length > 0 &&
          !allowedPlugins.includes(feature.plugin.name)) ||
        !feature.pads
      ) {
        return false;
      }

      if (
        klasses.length > 0 &&
        klasses.filter(klass => !!feature.klass.includes(klass)).length !==
          klasses.length
      ) {
        return false;
      }

      return feature.pads.some(pad => {
        if (directions.length > 0 && !directions.includes(pad.direction)) {
          return false;
        }

        if (includesAnyPads && pad.any) {
          return true;
        }

        const capsFound = (pad.capabilities || []).findIndex(ccaps => {
          if (ccaps.mimetype.toLowerCase() !== mimetype) {
            return false;
          }

          return validateCapabilities(ccaps, caps);
        });

        return capsFound !== -1;
      });
    })
    .sort(rankSort);

module.exports = findFeaturesFor;
