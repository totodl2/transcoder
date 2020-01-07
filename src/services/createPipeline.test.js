const createPipeline = require('./createPipeline');
const util = require('util');
const media = require('../../test_assets/media2');
const conf = require('../../test_assets/config');

describe('createPipeline', () => {
  it('ok', () => {
    const pp = createPipeline({
      filepath: '/transco/mm.mkv',
      outputDir: '/transco/test',
      media,
      conf,
    });
    console.log(JSON.stringify(pp.asArray()));
    console.log(pp.asArray().join(' '));
  });
});
