var joi = require('joi'),
  async = require('async'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator');

module.exports = ExpiresDecorator;

/**
 * Expire Redis-backed cache
 *
 * @param {Cache} cache
 * @param {Object} [config]
 * @param {String} [config.expiresIn] in ms
 * @param {String} [config.staleIn] in ms
 */

function ExpiresDecorator(cache, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    expiresIn: joi.number().integer().min(0).default(Infinity),
    staleIn: joi.number().integer().min(0).default(Infinity)
  }));
  this.on('set', this.setCreatedAt.bind(this));
  this._store = this._getStore();
}

inherits(ExpiresDecorator, BaseDecorator);

/**
 * Set the createdAt timestamp for a given key.
 *
 * @param {String} key
 */

ExpiresDecorator.prototype.setCreatedAt = function (key) {
  this._store.setCreatedAt(key, Date.now(), this._emitError);
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

ExpiresDecorator.prototype.get = function (key, cb) {
  var cache = this._cache,
    self = this;

  async.waterfall([
    this._store.getCreatedAt.bind(this._store, key),

    function maybeGet(createdAt, icb) {
      var isExpired, isStale;

      if (createdAt === null) return icb(null, null);

      isExpired = createdAt + self._config.expiresIn < Date.now();
      isStale = createdAt + self._config.staleIn < Date.now();

      if (isExpired) {
        self.del(key, self._emitError);
        return icb(null, null);
      }

      if (isStale) {
        self.emit('stale', key);
      }

      cache.get(key, icb);
    }
  ], cb);
};
