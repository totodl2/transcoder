const findFeatures = require('./gstPlugins/findFeatures');
const { KLASS, DIRECTIONS } = require('./gstPlugins/plugins');
const debug = require('../debug')('verify');

const TYPE_SUBTITLES = 'subtitles';
const TYPE_AUDIO = 'audio';
const TYPE_VIDEO = 'video';

module.exports = (topology, constraints = {}) => {
  if (topology.type !== 'container') {
    return `Cannot found container`;
  }

  const demuxers = findFeatures({
    mimetype: topology.codec.type,
    directions: [DIRECTIONS.SINK],
    klasses: [KLASS.DEMUXER],
    allowedPlugins: constraints.demuxers || [],
  });

  if (demuxers.length <= 0) {
    return `Cannot found demuxers for codec type ${topology.codec.type}`;
  }

  debug('Demuxers founds for %O : %O', topology.codec.type, demuxers);

  for (let i = 0, sz = topology.streams.length; i < sz; i++) {
    const {
      type,
      codec: { type: mimetype, ...caps },
    } = topology.streams[i];
    const baseKlass = [];
    const { parsers: allowedParsers = [], decoders: allowedDecoders = [] } =
      constraints[type] || [];

    if (type === TYPE_SUBTITLES) {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (type === TYPE_AUDIO) {
      baseKlass.push(KLASS.AUDIO);
    } else if (type === TYPE_VIDEO) {
      baseKlass.push(KLASS.VIDEO);
    }

    const parsers = findFeatures({
      mimetype,
      directions: [DIRECTIONS.SINK],
      klasses: [...baseKlass, KLASS.PARSER],
      caps,
      allowedPlugins: allowedParsers,
    });

    if (parsers.length <= 0) {
      return `Cannot found parsers for codec ${mimetype} - ${JSON.stringify(
        caps,
      )}`;
    }

    debug('Parsers found for %O : %O', mimetype, parsers);

    const decoders = findFeatures({
      mimetype,
      directions: [DIRECTIONS.SINK],
      klasses: [...baseKlass, KLASS.DECODER],
      caps,
      allowedPlugins: allowedDecoders,
    });

    if (decoders.length <= 0) {
      return `Cannot found decoders for codec ${mimetype} - ${JSON.stringify(
        caps,
      )}`;
    }

    debug('Decoders found for %O : %O', mimetype, decoders);
  }

  return true;
};
