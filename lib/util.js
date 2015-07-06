var crypto = require('crypto'),
  once = require('lodash/function/once'),
  TimeoutError = require('common-errors').helpers
    .generateClass('TimeoutError'),
  HUMAN_IVAL_RE = /([\d.]+)\s?(ms|sec|min|hour|day|week|month|year)(?:ond|ute)?s?/,
  slice = Array.prototype.slice;

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

  cb = once(cb);

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
  if (typeof humanTime !== 'string') return humanTime;

  match = humanTime.match(HUMAN_IVAL_RE);
  if (!match) return humanTime;

  switch (match[2]) {
    case 'ms': ms = 1; break;
    case 'sec': ms = 1000; break;
    case 'min': ms = 1000 * 60; break;
    case 'hour': ms = 1000 * 60 * 60; break;
    case 'day': ms = 1000 * 60 * 60 * 24; break;
    case 'week': ms = 1000 * 60 * 60 * 24 * 7; break;
    case 'month': ms = 1000 * 60 * 60 * 24 * 30; break;
    case 'year': ms = 1000 * 60 * 60 * 24 * 356; break;
  }

  return parseFloat(match[1], 10) * ms;
};

/**
 * Create a namespace provided
 * a list of argument strings.
 *
 * @param {String} [namespacePart...]
 * @return {String}
 */

exports.createNamespace = function () {
  var args = slice.call(arguments);
  args = args.filter(function (arg) { if (arg) return true; });
  return args.join(':');
};

/**
 * Propagate selected events from one
 * EventEmitter to another.
 *
 * @param {EventEmitter} source
 * @param {EventEmitter} dest
 * @param {Array[String]} eventNames
 * @param {String} [sourceName] - added as the last argument
 *   to the event, in order to be able to uniquely id the source
 */

exports.propagateEvents = function (source, dest, eventNames, sourceName) {
  eventNames.forEach(function (eventName) {
    exports.propagateEvent(source, dest, eventName, sourceName);
  });
};

/**
 * Propagate an event from one
 * EventEmitter to another.
 *
 * @param {EventEmitter} source
 * @param {EventEmitter} dest
 * @param {Array[String]} eventName
 * @param {String} [sourceName] - added as the last argument
 *   to the event, in order to be able to uniquely id the source
 */

exports.propagateEvent = function (source, dest, eventName, sourceName) {
  source.on(eventName, function () {
    var args = slice.call(arguments);
    args.unshift(eventName);
    if (sourceName) args.push(sourceName);
    dest.emit.apply(dest, args);
  });
};
