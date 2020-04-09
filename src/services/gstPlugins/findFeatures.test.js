const { KLASS } = require('./plugins');
const findFeatures = require('./findFeatures');

describe('plugins', () => {
  const features = [
    {
      klass: [KLASS.CODEC, KLASS.DECODER],
      rank: 0,
      name: 'test1',
      hierarchy: [
        'GObject',
        'GInitiallyUnowned',
        'GstObject',
        'GstElement',
        'GstVideoDecoder',
        'GstAviDecoder',
      ],
      pads: [
        {
          direction: 2,
          capabilities: [
            {
              mimetype: 'video/x-msvideo',
              features: ['memory:SystemMemory'],
              mpegversion: 2,
            },
            {
              mimetype: 'video/x-msvideo',
              features: ['memory:SystemMemory'],
              mpegversion: 3,
            },
          ],
          any: true,
        },
      ],
      plugin: { name: 'test-plugin-1' },
    },
    {
      klass: [KLASS.CODEC, KLASS.DEMUXER],
      name: 'test',
      rank: 1,
      hierarchy: [
        'GObject',
        'GInitiallyUnowned',
        'GstObject',
        'GstElement',
        'GstAviDemux',
      ],
      pads: [
        {
          direction: 2,
          capabilities: [
            {
              mimetype: 'video/x-msvideo',
              features: ['memory:SystemMemory'],
              mpegversion: [1, 2, 4],
            },
          ],
          any: false,
        },
      ],
      plugin: { name: 'test-plugin' },
    },
  ];

  it('should find plugins with mimetype', () => {
    const results = findFeatures({ mimetype: 'video/x-msvideo' }, features);
    expect(results.length).toEqual(2);
    expect(results[0].name).toEqual('test');
    expect(results[1].name).toEqual('test1');
  });

  it('should find plugins with includeAnyPads', () => {
    const results = findFeatures(
      { mimetype: 'not/found', includesAnyPads: true },
      features,
    );
    expect(results.length).toEqual(1);
    expect(results[0].name).toEqual('test1');
  });

  it('should find plugins with specific klass', () => {
    const results = findFeatures(
      { mimetype: 'video/x-msvideo', klasses: [KLASS.DECODER] },
      features,
    );
    expect(results.length).toEqual(1);
    expect(results[0].name).toEqual('test1');
  });

  it('should not find plugins not allowed', () => {
    const results = findFeatures(
      { mimetype: 'video/x-msvideo', allowedPlugins: ['test-plugin'] },
      features,
    );
    expect(results.length).toEqual(1);
    expect(results[0].name).toEqual('test');
  });

  it('should find plugin with defined caps', () => {
    const results = findFeatures(
      { mimetype: 'video/x-msvideo', caps: { mpegversion: 4 } },
      features,
    );
    expect(results.length).toEqual(1);
    expect(results[0].name).toEqual('test');
  });

  it('should find plugin with defined caps if the plugin provide multiple times mimetype definition', () => {
    const results = findFeatures(
      { mimetype: 'video/x-msvideo', caps: { mpegversion: 3 } },
      features,
    );
    expect(results.length).toEqual(1);
    expect(results[0].name).toEqual('test1');
  });
});
