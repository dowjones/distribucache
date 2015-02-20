var EventEmitter = require('events').EventEmitter,
  inherits = require('util').inherits,
  joi = require('joi'),
  async = require('async'),
  createHash = require('./util').createHash;

module.exports = Cache;

/**
 * Basic Store-backed cache
 *
 * @param {Object} [config]
 * @param {String} [config.namespace]
 */

function Cache(store, config) {
  EventEmitter.call(this);
  config = this._validateConfig(config || {});
  this._config = config;
  this._nsp = config.namespace ? config.namespace + ':' : '';
  this._store = store;
}

inherits(Cache, EventEmitter);

/**
 * Get key from cache
 *
 * @param {String} key
 * @param {Function} cb
 */

Cache.prototype.get = function (key, cb) {
  this.emit('get', key);
  this._store.getValue(this._getDataKey(key), cb);
};

/**
 * Set a new object into the cache
 *
 * @param {String} key
 * @param {Object} value
 * @param {Function} cb
 */

Cache.prototype.set = function (key, value, cb) {
  this.emit('set', key, value);
  this._store.setValue(this._getDataKey(key), value, cb);
};

/**
 * Remove key from cache
 *
 * @param {String} key
 * @param {Function} cb
 */

Cache.prototype.del = function (key, cb) {
  this.emit('del', key);
  this._store.del(this._getDataKey(key), cb);
};

/**
 * Get primary store
 *
 * @protected
 * @returns {Store}
 */

Cache.prototype._getStore = function () {
  return this._store;
};

/**
 * Get the name of the "data" key
 * used to get / set / del into Redis.
 *
 * @protected
 * @param {String} key
 * @returns {String} namespaced key
 */

Cache.prototype._getDataKey = function (key) {
  return this._nsp + key + ':data';
};

/**
 * Validate and set defaults on the config.
 * Throw if the config is invalid.
 *
 * @private
 * @param {Object} config
 * @throws {Error} validation
 */

Cache.prototype._validateConfig = function (config) {
  var validation = joi.validate(config, joi.object().keys({
    namespace: joi.string()
  }));
  if (validation.error) throw validation.error;
  return validation.value;
};
