const canTranscode = require('./getAVDecodingElements');
const media = require('../../test_assets/media');
const media1 = require('../../test_assets/media1');
const mediaInvalid = require('../../test_assets/media-invalid-video');

describe('getAVDecodingElement', () => {
  it.only('should check demuxers', () => {
    expect(canTranscode(media1.topology)).not.toBe(false);
    expect(canTranscode(mediaInvalid.topology)).toBe(false);
    expect(canTranscode(media.topology)).not.toBe(false);
    expect(canTranscode(media.topology, { demuxers: ['none'] })).toBe(false);
    expect(canTranscode(media.topology, { video: { parsers: ['none'] } })).toBe(
      false,
    );
    expect(
      canTranscode(media.topology, { video: { decoders: ['none'] } }),
    ).toBe(false);
    expect(canTranscode(media.topology, { audio: { parsers: ['none'] } })).toBe(
      false,
    );
    expect(
      canTranscode(media.topology, { audio: { decoders: ['none'] } }),
    ).toBe(false);
  });
});
