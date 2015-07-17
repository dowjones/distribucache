var EventEmitter = require('eventemitter2').EventEmitter2,
  inherits = require('util').inherits;

module.exports = Cache;

/**
 * Basic Store-backed cache
 */

function Cache(store) {
  EventEmitter.call(this);
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
  this._store.getValue(key, cb);
};

/**
 * Set a new object into the cache
 *
 * @param {String} key
 * @param {Object} value
 * @param {Function} cb
 */

Cache.prototype.set = function (key, value, cb) {
  this._store.setValue(key, value, cb);
};

/**
 * Remove key from cache
 *
 * @param {String} key
 * @param {Function} cb
 */

Cache.prototype.del = function (key, cb) {
  this._store.del(key, cb);
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
