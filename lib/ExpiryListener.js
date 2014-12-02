var async = require('async'),
  defaults = require('lodash').defaults,
  joi = require('joi'),
  redis = require('redis'),
  lockr = require('redis-lockr'),
  EventEmitter = require('events').EventEmitter,
  inherits = require('util').inherits;

module.exports = ExpiryListener;

/**
 * Listen to expiring keys in redis
 *
 * Emits events:
 *   - listen - when listening to expiring keys
 *   - stop - stopped listening
 *   - expire - called when a key expires
 *       arguments: ({String} key, {Function} unlock)
 *       call the 'unlock' function when done.
 *
 * @param {Object} [config]
 * @param {String} [config.host] defaults to 'localhost'
 * @param {Number} [config.port] defaults to 6379
 * @param {String} [config.password]
 * @param {String} [config.namespace]
 * @param {Number} [config.leaseTimeout] lease expiration in ms
 *   defaults to 500
 */

function ExpiryListener(config) {
  EventEmitter.call(this);
  config = this._validateConfig(config || {});

  this._nsp = config.namespace ? config.namespace + ':' : '';
  this._channel = '__keyspace@0__:' + this._nsp + '*:trigger';

  this._leaseClient = redis.createClient(config.port, config.host);
  this._subClient = redis.createClient(config.port, config.host);
  if (config.password) {
    this._leaseClient.auth(config.password);
    this._subClient.auth(config.password);
  }

  this._lease = lockr(this._leaseClient, {
    lifetime: config.leaseTimeout
  });
}

inherits(ExpiryListener, EventEmitter);

/**
 * Enable redis keyspace events and
 * subscribe to the trigger events
 */

ExpiryListener.prototype.listen = function () {
  var client = this._subClient,
    onExpiry = this._onExpiry.bind(this),
    self = this;

  async.waterfall([
    client.config.bind(client, 'get', 'notify-keyspace-events'),

    function enable(config, cb) {
      var cfg = config[1];
      if (cfg.indexOf('K') === -1) config += 'K'; // keyspace events
      if (cfg.indexOf('x') === -1) config += 'x'; // notify on expire
      client.config('set', 'notify-keyspace-events', cfg, cb);
    },

    function subscribe(clientResponse, cb) {
      client.psubscribe(self._channel);
      client.on('pmessage', onExpiry);
      cb(null);
    }
  ], function (err) {
    if (err) self.emit('error', err);
    self.emit('listen');
  });
};

/**
 * Stop listening to keyspace expiry events.
 */

ExpiryListener.prototype.stopListening = function () {
  var self = this;
  function emitEvent(err) {
    if (err) self.emit('error', err);
    self.emit('stop');
  }
  this._subClient.punsubscribe(self._channel, emitEvent);
};

/**
 * Validate and set defaults on the config.
 * Throw if the config is invalid.
 */

ExpiryListener.prototype._validateConfig = function (config) {
  var validation = joi.validate(config, joi.object().keys({
    host: joi.string().default('localhost'),
    port: joi.number().integer().default(6379),
    password: joi.string(),
    namespace: joi.string(),
    leaseTimeout: joi.number().integer().default(500)
  }));

  if (validation.error) throw validation.error;

  return validation.value;
};

/**
 * On every event, aquire a lease, and if
 * one is aquired attempt to populate the cache.
 *
 * If the lease cannot be aquired (i.e., another process
 * is in the process of populating this key) do nothing.
 */

ExpiryListener.prototype._onExpiry = function (pattern, channel, message) {
  var chan, cacheKey, lockKey, self;
  if ('expired' !== message) return;

  chan = channel.split(':');
  cacheKey = chan[chan.length - 2];
  lockKey = this._nsp + cacheKey;
  self = this;

  function critical(err, unlock) {
    if (err) {
      if (!/Exceeded max retry count/.test(err.message)) {
        err.message = 'could not aquire lock for: ' +
          lockKey + '; cause:' + err.message;
        self.emit('error', err);
      }
      return;
    }
    try {
      self.emit('expire', cacheKey, function (err) {
        if (err) {
          err.message = 'failed to perform action on expire; cause:' + err.message;
          self.emit('error', err);
        }
        unlock();
      });
    } catch (e) {
      unlock();
      self.emit('error', e);
    }
  }

  this._lease(lockKey, critical);
};
