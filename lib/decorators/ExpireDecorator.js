var joi = require('joi'),
  async = require('async'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator');

module.exports = ExpireDecorator;

/**
 * Expire Redis-backed cache
 *
 * @param {Cache} cache
 * @param {Object} [config]
 * @param {String} [config.expiresIn] in ms
 */

function ExpireDecorator(cache, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    expiresIn: joi.number().integer().required()
  }));
}

inherits(ExpireDecorator, BaseDecorator);

/**
 * Get a value from the cache.
 *
 * If the returned value has expired,
 * null will be returned, and the item
 * will be deleted from the db.
 *
 * @param {String} key
 * @param {Function} cb
 */

ExpireDecorator.prototype.get = function (key, cb) {
  var cache = this._cache, 
    dataKey = cache._getDataKey(key),
    client = cache._getClient(),
    expiresIn = this._config.expiresIn,
    self = this;

  async.waterfall([
    client.hget.bind(client, dataKey, 'createdAt'),

    function maybeGet(createdAt, cb) {
      var isExpired;

      if (null === createdAt) return cb(null, null);
      createdAt = parseInt(createdAt, 10);

      isExpired = createdAt + expiresIn < Date.now();

      if (isExpired) {
        self.del(key);
        return cb(null, null);
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
    client = cache._getClient();

  async.waterfall([
    client.hset.bind(client, dataKey, 'createdAt', Date.now()),
    function setValue(response, cb) {
      cache.set(key, value, cb);
    }
  ], cb);
};
