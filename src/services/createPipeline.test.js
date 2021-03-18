const createPipeline = require('./createPipeline');
const media = require('../../test_assets/media2');
const conf = require('../../test_assets/config');

describe('createPipeline', () => {
  it.only('create file pipe', () => {
    const pp = createPipeline({
      filepath: '/transco/mm.mkv',
      output: '/transco/test',
      media,
      conf,
    });
    expect(pp.pipeline.asArray()).toMatchSnapshot();
    expect(pp.output).toMatchSnapshot();
  });

  it.only('create http pipe', () => {
    const pp = createPipeline({
      filepath: 'http://test.com/mm.mkv',
      output: 'http://test.com/transco/test',
      media,
      conf,
    });
    expect(pp.pipeline.asArray()).toMatchSnapshot();
    expect(pp.output).toMatchSnapshot();
  });
});
