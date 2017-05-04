/* istanbul ignore next */
if (global.layer && global.layer.Client) {
  console.error('ERROR: It appears that you have multiple copies of the Layer WebSDK in your build!');
} else {
  global.layer = require('./lib/layer');
}
module.exports = global.layer;
