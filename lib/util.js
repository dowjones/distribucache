var crypto = require('crypto'),
  _ = require('lodash'),
  TimeoutError = require('common-errors').helpers
    .generateClass('TimeoutError'),
  HUMAN_IVAL_RE = /([\d.]+)\s?(ms|sec|min|hour|day|week|month|year)(?:ond|ute)?s?/;

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

/**
 * Convert human-readible time-interval
 * to milliseconds.
 *
 * Examples:
 *   - '1 ms'
 *   - '5 days'
 *   - '3 minutes'
 *   - '10 hours'
 *   - '30 seconds'
 *
 * Available abbreviations:
 *   - ms
 *   - sec -> second
 *   - min -> minute 
 *
 * @param {String} humanTime
 * @return {Number} ms
 */

exports.intervalToMs = function (humanTime) {
  var match, ms;
  if ('string' !== typeof humanTime) return humanTime;

  match = humanTime.match(HUMAN_IVAL_RE);
  if (!match) return;

  switch (match[2]) {
    case 'ms':    ms = 1; break;
    case 'sec':   ms = 1000; break;
    case 'min':   ms = 1000 * 60; break;
    case 'hour':  ms = 1000 * 60 * 60; break;
    case 'day':   ms = 1000 * 60 * 60 * 24; break;
    case 'week':  ms = 1000 * 60 * 60 * 24 * 7; break;
    case 'month': ms = 1000 * 60 * 60 * 24 * 30; break;
    case 'year':  ms = 1000 * 60 * 60 * 24 * 356; break;
  }

  return parseInt(match[1], 10) * ms;
};
