var crypto = require('crypto'),
  redis = require('redis');

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
