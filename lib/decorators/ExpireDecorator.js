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
 * @param {String} [config.staleIn] in ms
 */

function ExpireDecorator(cache, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    expiresIn: joi.number().integer().default(Infinity),
    staleIn: joi.number().integer().default(Infinity)
  }));
  this.on('set', this.setCreatedAt.bind(this));
}

inherits(ExpireDecorator, BaseDecorator);

/**
 * Set the createdAt timestamp for a given key.
 *
 * @param {String} key
 */

ExpireDecorator.prototype.setCreatedAt = function (key) {
  this._getClient().hset(this._getDataKey(key),
    'createdAt', Date.now(), this._emitError);
};

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
    client = cache._getClient(),
    self = this;

  async.waterfall([
    client.hget.bind(client, cache._getDataKey(key), 'createdAt'),

    function maybeGet(createdAt, cb) {
      var isExpired, isStale;

      if (null === createdAt) return cb(null, null);
      createdAt = parseInt(createdAt, 10);

      isExpired = createdAt + self._config.expiresIn < Date.now();
      isStale = createdAt + self._config.staleIn < Date.now();

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
