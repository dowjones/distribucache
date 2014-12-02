var crypto = require('crypto'),
  _ = require('lodash'),
  TimeoutError = require('common-errors').helpers
    .generateClass('TimeoutError');

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

/**
 * Ensure that the callback
 * completes within the provided
 * number of milliseconds.
 *
 * @param {Number} ms
 * @param {Function} cb
 */

exports.completeWithin = function (ms, cb) {
  var timeoutId;

  cb = _.once(cb);

  timeoutId = setTimeout(function () {
    cb(new TimeoutError('timed out after ' + ms + 'ms'));
  }, ms);

  function wrap() {
    clearTimeout(timeoutId);
    cb.apply(null, arguments);
  }

  return wrap;
};
