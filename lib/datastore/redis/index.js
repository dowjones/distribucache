var EventEmitter = require('events').EventEmitter,
  inherits = require('util').inherits,
  lockr = require('redis-lockr'),
  util = require('./util');

module.exports = RedisStore;

function RedisStore(config) {
  EventEmitter.call(this);
  this._config = config || {};

  this._client = util.createRedisClient(this._config);
  this._client.on('error', this._onError.bind(this));

  this._subClient = util.createRedisClient(this._config);
  this._subClient.on('error', this._onError.bind(this));

  if (!this._config.isPreconfigured) {
    util.ensureKeyspaceNotifications(
      this._client, toErrorEvent(this));
  }
}

inherits(RedisStore, EventEmitter);

RedisStore.prototype.createLock = function (ttl) {
  return lockr(this._client, {lifetime: ttl});
};

RedisStore.prototype.del = function (key, cb) {
  this._client.del(key, errorOrNothing(cb));
};

RedisStore.prototype.getAccessedAt = function (key, cb) {
  this._client.hget(key, 'accessedAt', toNumber(cb));
};

RedisStore.prototype.getCreatedAt = function (key, cb) {
  this._client.hget(key, 'createdAt', toNumber(cb));
};

RedisStore.prototype.getHash = function (key, cb) {
  this._client.hget(key, 'hash', cb);
};

RedisStore.prototype.getValue = function (key, cb) {
  this._client.hget(key, 'value', cb);
};

RedisStore.prototype.setAccessedAt = function (key, date, cb) {
  this._client.hset(key, 'accessedAt', date, errorOrNothing(cb));
};

RedisStore.prototype.setCreatedAt = function (key, date, cb) {
  this._client.hset(key, 'createdAt', date, errorOrNothing(cb));
};

RedisStore.prototype.setHash = function (key, hash, cb) {
  this._client.hset(key, 'hash', hash, errorOrNothing(cb));
};

RedisStore.prototype.setValue = function (key, value, cb) {
  this._client.hset(key, 'value', value, errorOrNothing(cb));
};

RedisStore.prototype.setTrigger = function (key, ttl, cb) {
  this._client.psetex(key, ttl, '', errorOrNothing(cb));
};

RedisStore.prototype.subscribe = function (channel, onMessage, cb) {
  this._subClient.psubscribe(channel, errorOrNothing(cb));
  this._subClient.on('pmessage', onMessage);
};

RedisStore.prototype.unsubscribe = function (channel, cb) {
  this._client.punsubscribe(channel, errorOrNothing(cb));
};

/**
 * Proxy all redis error events to the
 * CacheClient error events.
 *
 * @private
 * @param {Error} err
 */

RedisStore.prototype._onError = function (err) {
  this.emit('error', err);
};

function toNumber(cb) {
  return function (err, value) {
    if (err) return cb(err);
    cb(null, value && parseInt(value, 10));
  };
}

function toErrorEvent(emitter) {
  return function (err) {
    emitter.emit('error', err);
  };
}

function errorOrNothing(cb) {
  return function (err) {
    cb(err);
  };
}
