var crypto = require('crypto'),
  redis = require('redis'),
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
  if (!match) return humanTime;

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
  var args = Array.prototype.slice.call(arguments);
  args = args.filter(function (arg) { if (arg) return true; });
  return args.join(':');
};

/**
 * Set the 'notify-keyspace-events' config in Redis
 *
 * @param {RedisClient} client
 * @param {Function} cb
 */

exports.ensureKeyspaceNotifications = function (client, cb) {
  function maybeSet(err, config) {
    if (err) {
      if (!/unknown command 'config'/.test(err.message)) return cb(err);
      console.warn('[distribucache] could not check and ' +
        '"set notify-keyspace-events Kx" programmatically. ' +
        'Make sure you configure it manually for this Redis instance.');
      return cb(null, 'NOT CONFIGURED');
    }
    var cfg = config[1]; // e.g., 0 -> "notify-keyspace-events", 1 -> "xK"
    if (cfg.indexOf('K') > -1 && cfg.indexOf('x') > -1) return cb(null, 'CONFIGURED');
    if (cfg.indexOf('K') === -1) cfg += 'K'; // keyspace events
    if (cfg.indexOf('x') === -1) cfg += 'x'; // notify on expire
    client.config('set', 'notify-keyspace-events', cfg, cb);
  }

  client.config('get', 'notify-keyspace-events', maybeSet);
};

/**
 * Create a new Redis client
 *
 * @param {Object} [cfg]
 * @param {String} [cfg.host] defaults to 'localhost'
 * @param {Number} [cfg.port] defaults to 6379
 * @param {String} [cfg.password]
 */

exports.createRedisClient = function (cfg) {
  cfg = cfg || {};
  var client = redis.createClient(
    cfg.port || 6379, cfg.host || 'localhost');
  if (cfg.password) client.auth(cfg.password);
  return client;
};

/**
 * Helper to be passed to functions
 * that do not need to callback, but
 * do need to log in case of an error;
 *
 * @param {Object} [logger] defaults to `console`
 * @returns {Function} (err)
 */

exports.logError = function (logger) {
  logger = logger || console;
  return function (err) {
    if (err) return logger.error(err);
  };
};
