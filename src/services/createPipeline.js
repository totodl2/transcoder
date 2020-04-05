const gst = require('node-gstreamer-launch/src/index');
const path = require('path');
const get = require('lodash.get');
const set = require('lodash.set');
const querystring = require('querystring');

const convert = require('convert-units');
const TYPES = require('./gstPlugins/streamTypes');
const getAVDecodingElements = require('./getAVDecodingElements');

const queueConf = {
  // 'max-size-bytes': 512000000,
  // 'max-size-time': 0,
};

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

    if (bitrate > streamBitrate && streamBitrate !== 0) {
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
  output,
  media: { topology },
  conf: { constraints, presets, subtitles },
}) => {
  const outputResult = {};
  const isHttp = output.substr(0, 4).toLowerCase() === 'http';
  const main = gst.pipeline(
    gst.element(isHttp ? 'souphttpsrc' : 'filesrc', { location: filepath }),
  );
  const avDecoders = getAVDecodingElements(topology, constraints);

  if (avDecoders === false) {
    throw new Error('Cannot transcode media');
  }

  main.next(gst.element(avDecoders.container.name, { name: 'demuxer' }));

  const availablePresets = getAvailablePresets(topology, presets).map(
    preset => {
      const { name, muxer } = preset;
      const data = {
        type: TYPES.CONTAINER,
        preset: name,
        name: muxer.filename || name,
      };
      data.location = isHttp
        ? `${output}${
            output.indexOf('?') !== -1 ? '&' : '?'
          }${querystring.stringify(data)}`
        : path.join(output, `/${data.name}`);

      outputResult[preset.name] = data;
      const pipeline = main
        .fork(
          gst.element(muxer.type, {
            ...(muxer.params || {}),
            name,
          }),
        )
        .next(
          gst.element(isHttp ? 'curlhttpsink' : 'filesink', {
            location: data.location,
            ...(isHttp ? { sync: false } : {}),
          }),
        );

      data.streams = [];
      return { ...preset, pipeline };
    },
  );

  // counters used for max limitation in config.json
  const counters = {};
  const presetsTypes = [
    ...new Set(
      Object.values(presets).reduce(
        (prev, preset) => prev.concat(Object.keys(preset)),
        [],
      ),
    ),
  ];

  for (let i = 0, subOffset = 0, sz = topology.streams.length; i < sz; i++) {
    const stream = topology.streams[i];
    const { type, codec, streamId } = stream;

    if (type === TYPES.SUBTITLES) {
      if (!subtitles || !new RegExp(subtitles.accept, 'i').test(codec.type)) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const data = {
        type: TYPES.SUBTITLES,
        preset: 'subtitles',
        name: subtitles.filename
          ? subtitles.filename.replace('%i', subOffset++)
          : `sub-${subOffset++}`,
      };
      data.location = isHttp
        ? `${output}${
            output.indexOf('?') !== -1 ? '&' : '?'
          }${querystring.stringify(data)}`
        : path.join(output, `/${data.name}`);

      if (!outputResult.subtitles) {
        outputResult.subtitles = [];
      }
      outputResult.subtitles.push(data);

      main
        .fork(main.link('demuxer'))
        .next(gst.element(subtitles.encoder.instance, subtitles.encoder.params))
        .next(gst.element('queue', queueConf))
        .next(
          gst.element(isHttp ? 'curlhttpsink' : 'filesink', {
            location: data.location,
            ...(isHttp ? { sync: false } : {}),
          }),
        );

      data.stream = stream;
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!presetsTypes.includes(type)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const { parser, decoder } = avDecoders.streams[streamId];
    const teeName = `${type}_${i}`;
    const decodingPipe = main
      .fork(main.link('demuxer'))
      .next(gst.element(parser.name))
      .next(gst.element('queue', queueConf))
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
      outputResult[preset.name].streams.push(stream);
      const encodingPipe = main
        .fork(decodingPipe.link(teeName))
        .next(gst.element('queue', queueConf));

      preset[type].forEach(element => {
        encodingPipe.next(createElement(stream, element, counters));
      });

      encodingPipe
        .next(gst.element('queue', queueConf))
        .next(preset.pipeline.link(preset.name));
    });
  }

  return { pipeline: main, output: outputResult };
};

module.exports = createPipeline;
