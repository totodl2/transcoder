const findFeatures = require('./gstPlugins/findFeatures');
const { KLASS, DIRECTIONS } = require('./gstPlugins/plugins');
const TYPES = require('./gstPlugins/streamTypes');
const debug = require('../debug')('verify');

module.exports = (topology, constraints = {}) => {
  if (topology.type !== TYPES.CONTAINER) {
    debug(`Cannot find container`);
    return false;
  }

  const demuxers = findFeatures({
    mimetype: topology.codec.type,
    directions: [DIRECTIONS.SINK],
    klasses: [KLASS.DEMUXER],
    allowedPlugins: constraints.demuxers || [],
  });

  const output = { container: demuxers[0], streams: {} };

  if (demuxers.length <= 0) {
    debug(`Cannot found demuxers for codec type ${topology.codec.type}`);
    return false;
  }

  for (let i = 0, sz = topology.streams.length; i < sz; i++) {
    const {
      type,
      streamId,
      // eslint-disable-next-line camelcase
      codec: { type: mimetype, codec_data, ...caps },
    } = topology.streams[i];
    const baseKlass = [];
    const { parsers: allowedParsers = [], decoders: allowedDecoders = [] } =
      constraints[type] || [];

    if (type === TYPES.SUBTITLES) {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (type === TYPES.AUDIO) {
      baseKlass.push(KLASS.AUDIO);
    } else if (type === TYPES.VIDEO) {
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
      debug(
        `Cannot found parsers for codec ${mimetype} - ${JSON.stringify(caps)}`,
      );
      return false;
    }

    const { 'stream-format': sf, ...decodingCaps } = caps;
    const decoders = findFeatures({
      mimetype,
      directions: [DIRECTIONS.SINK],
      klasses: [...baseKlass, KLASS.DECODER],
      caps: decodingCaps,
      allowedPlugins: allowedDecoders,
    });

    if (decoders.length <= 0) {
      debug(`Cannot found decoders for codec ${mimetype} - %O`, decodingCaps);
      return false;
    }

    output.streams[streamId] = {
      decoder: decoders[0],
      parser: parsers[0],
    };
  }

  return output;
};
