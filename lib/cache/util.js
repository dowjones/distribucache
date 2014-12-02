var crypto = require('crypto');

/**
 * Create an md5 hash
 *
 * @param {String} str input
 * @returns {String} hash
 */

exports.createHash = function (str) {
  return crypto
    .createHash('md5')
    .update(str.toString())
    .digest('hex');
};
