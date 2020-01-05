const canTranscode = require('./canTranscode');
const media = require('../../test_assets/media');
const media1 = require('../../test_assets/media1');
const mediaInvalid = require('../../test_assets/media-invalid-video');

describe('canTranscode', () => {
  it.only('should check demuxers', () => {
    expect(canTranscode(media1.topology)).toBe(true);
    expect(canTranscode(mediaInvalid.topology)).not.toBe(true);
    expect(canTranscode(media.topology)).toBe(true);
    expect(canTranscode(media.topology, { demuxers: ['none'] })).not.toBe(true);
    expect(
      canTranscode(media.topology, { video: { parsers: ['none'] } }),
    ).not.toBe(true);
    expect(
      canTranscode(media.topology, { video: { decoders: ['none'] } }),
    ).not.toBe(true);
    expect(
      canTranscode(media.topology, { audio: { parsers: ['none'] } }),
    ).not.toBe(true);
    expect(
      canTranscode(media.topology, { audio: { decoders: ['none'] } }),
    ).not.toBe(true);
  });
});
