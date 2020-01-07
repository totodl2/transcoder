const gst = require('node-gstreamer-launch/src/index');
const path = require('path');
const get = require('lodash.get');
const set = require('lodash.set');
const convert = require('convert-units');
const TYPES = require('./gstPlugins/streamTypes');
const getAVDecodingElements = require('./getAVDecodingElements');

const createElement = (stream, element, counters) => {
  const seen = get(counters, element.params.type, 0);
  const max = get(element, 'max', null);
  const params =
    max !== null && seen + 1 > max ? element.fallback : element.params;
  const { bitrateUnit, ...props } = params.props || {};
  const gstElement = gst[element.instance](params.type, props);
  const presetBitrate = get(params, 'props.bitrate');
  const streamBitrate = get(stream, 'bitrate');
  if (presetBitrate !== undefined && streamBitrate !== undefined) {
    const presetBitrateUnit = bitrateUnit || 'b';
    const bitrate = convert(presetBitrate)
      .from(presetBitrateUnit)
      .to('b');

    if (bitrate > streamBitrate) {
      gstElement.prop(
        'bitrate',
        Math.round(
          convert(streamBitrate)
            .from('b')
            .to(presetBitrateUnit),
        ),
      );
    }
  }

  const presetHeight =
    element.instance === 'element'
      ? gstElement.prop('height')
      : get(gstElement.prop('height'), '[0]');

  // resize
  if (presetHeight && stream.width && stream.height) {
    const ratio = stream.width / stream.height;
    const newWidth = Math.floor(presetHeight * ratio);
    gstElement.prop('width', newWidth % 2 === 1 ? newWidth + 1 : newWidth);
  }

  set(counters, params.type, get(counters, params.type, 0) + 1);
  return gstElement;
};

const getAvailablePresets = (topology, presets) => {
  const videoStream = topology.streams.find(
    stream => stream.type === TYPES.VIDEO,
  );

  return Object.entries(presets)
    .filter(
      ([, preset]) =>
        preset.minHeight === undefined ||
        videoStream.height >= preset.minHeight,
    )
    .map(([name, preset]) => ({ ...preset, name }));
};

const createPipeline = ({
  filepath,
  outputDir,
  media: { topology },
  conf: { constraints, presets },
}) => {
  const outputFiles = [];
  const main = gst.pipeline(gst.element('filesrc', { location: filepath }));
  const avDecoders = getAVDecodingElements(topology, constraints);

  if (avDecoders === false) {
    throw new Error('Cannot transcode media');
  }

  main.next(gst.element(avDecoders.container.name, { name: 'demuxer' }));

  const availablePresets = getAvailablePresets(topology, presets).map(
    preset => {
      const { name, muxer } = preset;
      const outfile = path.join(outputDir, `/${name}`);
      outputFiles.push({ type: TYPES.CONTAINER, file: outfile, preset: name });
      const pipeline = main
        .fork(
          gst.element(muxer.type, {
            ...(muxer.props || {}),
            name,
          }),
        )
        .next(gst.element('filesink', { location: outfile }));
      return { ...preset, pipeline };
    },
  );

  // counters used for max limitation in config.json
  const counters = {};
  for (let i = 0, subOffset = 0, sz = topology.streams.length; i < sz; i++) {
    const stream = topology.streams[i];
    const { type, codec, streamId } = stream;

    if (type === TYPES.SUBTITLES) {
      if (codec.type !== 'text/x-raw') {
        // eslint-disable-next-line no-continue
        continue;
      }

      const outfile = path.join(outputDir, `/sub${subOffset++}.vtt`);
      outputFiles.push({
        type: TYPES.SUBTITLES,
        stream: topology.streams[i],
        file: outfile,
      });
      main
        .fork(main.link('demuxer'))
        .next(gst.element('webvttenc'))
        .next(gst.element('queue'))
        .next(gst.element('filesink', { location: outfile }));
      // eslint-disable-next-line no-continue
      continue;
    }

    const { parser, decoder } = avDecoders.streams[streamId];

    const teeName = `${type}_${i}`;
    const decodingPipe = main
      .fork(main.link('demuxer'))
      .next(gst.element(parser.name))
      .next(gst.element(decoder.name))
      .next(
        gst.element('progressreport', {
          name: `update_${teeName}`,
          'update-freq': 1,
        }),
      )
      .next(gst.element('tee', { name: teeName }));

    // eslint-disable-next-line no-loop-func
    availablePresets.forEach(preset => {
      const encodingPipe = main.fork(decodingPipe.link(teeName));

      preset[type].forEach(element => {
        encodingPipe.next(createElement(stream, element, counters));
      });

      encodingPipe
        .next(gst.element('queue'))
        .next(preset.pipeline.link(preset.name));
    });
  }

  return main;
};

module.exports = createPipeline;
