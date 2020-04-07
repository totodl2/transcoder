// eslint-disable-next-line import/no-unresolved
const { systemPlugins, systemFeatures } = require('./cache.json');

const DIRECTION_SRC = 1;
const DIRECTION_SINK = 2;
const DIRECTION_UNK = 0;

const KLASS_ENCODER = 'encoder';
const KLASS_DECODER = 'decoder';
const KLASS_DEMUXER = 'demuxer';
const KLASS_MUXER = 'muxer';
const KLASS_PARSER = 'parser';
const KLASS_CODEC = 'codec';
const KLASS_VIDEO = 'video';
const KLASS_AUDIO = 'audio';
const KLASS_SUBTITLE = 'subtitle';

module.exports = {
  systemPlugins,
  systemFeatures,
  DIRECTIONS: {
    SRC: DIRECTION_SRC,
    SINK: DIRECTION_SINK,
    UNK: DIRECTION_UNK,
  },
  KLASS: {
    ENCODER: KLASS_ENCODER,
    DECODER: KLASS_DECODER,
    DEMUXER: KLASS_DEMUXER,
    MUXER: KLASS_MUXER,
    PARSER: KLASS_PARSER,
    CODEC: KLASS_CODEC,
    VIDEO: KLASS_VIDEO,
    AUDIO: KLASS_AUDIO,
    SUBTITLE: KLASS_SUBTITLE,
  },
};
