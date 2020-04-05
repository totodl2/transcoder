const createPipeline = require('./createPipeline');
const media = require('../../test_assets/media2');
const conf = require('../../test_assets/config');

describe('createPipeline', () => {
  it.only('create pipe', () => {
    const pp = createPipeline({
      filepath: '/transco/mm.mkv',
      output: '/transco/test',
      media,
      conf,
    });
    expect(pp.pipeline.asArray()).toMatchSnapshot();
    expect(pp.output).toMatchSnapshot();
  });
});
