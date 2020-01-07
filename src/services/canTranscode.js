const getAVDecodingElements = require('./getAVDecodingElements');

module.exports = (topology, constraints = {}) =>
  !!getAVDecodingElements(topology, constraints);
