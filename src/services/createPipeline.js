const gst = require('node-gstreamer-launch/src/index');
const path = require('path');
const { KLASS, DIRECTIONS } = require('./gstPlugins/plugins');
const findFeatures = require('./gstPlugins/findFeatures');

const TYPE_SUBTITLES = 'subtitles';
const TYPE_AUDIO = 'audio';
const TYPE_VIDEO = 'video';

const createPipeline = ({
  filepath,
  outputDir,
  media: { topology },
  conf: { muxer: muxerConf, constraints, presets },
}) => {
  const main = gst.pipeline(
    gst.element('filesrc', { name: 'input', location: filepath }),
  );
  const containerPath = path.join(outputDir, '/container');
  const demuxer = findFeatures({
    mimetype: topology.codec.type,
    directions: [DIRECTIONS.SINK],
    klasses: [KLASS.DEMUXER],
    allowedPlugins: constraints.demuxers || [],
  })[0];

  main.next(gst.element(demuxer.name));
  const muxer = main
    .fork(
      gst.element(muxerConf.type, {
        ...(muxerConf.props || {}),
        name: 'muxer',
      }),
    )
    .next(gst.element('filesink', { location: containerPath }));

  for (let i = 0, subOffset = 0, sz = topology.streams.length; i < sz; i++) {
    const {
      type,
      codec: { type: mimetype, ...caps },
    } = topology.streams[i];

    const baseKlass = [];
    const { parsers: allowedParsers = [], decoders: allowedDecoders = [] } =
      constraints[type] || [];

    if (type === TYPE_SUBTITLES) {
      const subPath = path.join(outputDir, `/sub${subOffset++}.vtt`);
      main.fork(gst.element('webvtt')).next('filesink', { location: subPath });
      // eslint-disable-next-line no-continue
      continue;
    }

    if (type === TYPE_AUDIO) {
      baseKlass.push(KLASS.AUDIO);
    } else if (type === TYPE_VIDEO) {
      baseKlass.push(KLASS.VIDEO);
    }

    const parser = findFeatures({
      mimetype,
      directions: [DIRECTIONS.SINK],
      klasses: [...baseKlass, KLASS.PARSER],
      caps,
      allowedPlugins: allowedParsers,
    })[0];

    const decoder = findFeatures({
      mimetype,
      directions: [DIRECTIONS.SINK],
      klasses: [...baseKlass, KLASS.DECODER],
      caps,
      allowedPlugins: allowedDecoders,
    })[0];

    main
      .fork(main.link('input'))
      .next(gst.element(parser.name))
      .next(gst.element(decoder.name))
      .next(muxer.link('muxer'));
  }

  return main;
};

module.exports = createPipeline;
