const createPipeline = require('./createPipeline');
const media = require('../../test_assets/media');
const conf = require('../../test_assets/config');

describe('createPipeline', () => {
  it('ok', () => {
    const pp = createPipeline({
      file: '/not/found',
      outputDir: '/tmp',
      media,
      conf,
    });
    console.log(pp.asArray());
  });
});
