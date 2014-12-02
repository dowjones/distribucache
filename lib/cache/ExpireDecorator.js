var EventEmitter = require('events').EventEmitter,
  inherits = require('util').inherits,
  joi = require('joi'),
  async = require('async');

module.exports = ExpireDecorator;

/**
 * Expire Redis-backed cache
 *
 * @param {Cache} cache
 * @param {Object} [config]
 * @param {String} [config.expiresIn] in ms
 * @param {String} [config.staleIn] in ms
 */

function ExpireDecorator(cache, config) {
  EventEmitter.call(this);
  this._cache = cache;
  this._config = this._validateConfig(config || {});
}

inherits(ExpireDecorator, EventEmitter);

/**
 * Get a value from the cache.
 *
 * If the returned value has expired,
 * null will be returned, and the item
 * will be deleted from the db.
 *
 * If the value is stale, return it anyway 
 * and emit a `stale` event with the key as
 * the first argument.
 *
 * @param {String} key
 * @param {Function} cb
 */

ExpireDecorator.prototype.get = function (key, cb) {
  var cache = this._cache, 
    dataKey = cache._getDataKey(key),
    client = cache._client,
    expiresIn = this._config.expiresIn,
    staleIn = this._config.staleIn,
    self = this;

  async.waterfall([
    client.hget.bind(client, dataKey, 'createdAt'),

    function maybeGet(createdAt, cb) {
      var isExpired, isStale;

      if (null === createdAt) return cb(null, null);
      createdAt = parseInt(createdAt, 10);

      isExpired = createdAt + expiresIn < Date.now();
      isStale = createdAt + staleIn < Date.now();

      if (isExpired) {
        self.del(key);
        return cb(null, null);
      }

      if (isStale) {
        self.emit('stale', key);
      }

      cache.get(key, cb);
    }
  ], cb);
};

/**
 * Set a value into the cache,
 * storing the value along with its
 * creation date / time.
 *
 * @param {String} key
 * @param {Object} value
 * @param {Function} cb
 */

ExpireDecorator.prototype.set = function (key, value, cb) {
  var cache = this._cache, 
    dataKey = cache._getDataKey(key),
    client = cache._client;

  async.waterfall([
    client.hset.bind(client, dataKey, 'createdAt', Date.now()),
    function setValue(response, cb) {
      cache.set(key, value, cb);
    }
  ], cb);
};

/**
 * Remove key from cache
 *
 * @param {String} key
 * @param {Function} cb
 */

ExpireDecorator.prototype.del = function (key, cb) {
  this._cache.del(key, cb);
};

/**
 * Validate and set defaults on the config.
 * Throw if the config is invalid.
 */

ExpireDecorator.prototype._validateConfig = function (config) {
  var validation = joi.validate(config, joi.object().keys({
    expiresIn: joi.number().integer().default(Infinity),
    staleIn: joi.number().integer().default(Infinity)
  }));
  if (validation.error) throw validation.error;
  return validation.value;
};
