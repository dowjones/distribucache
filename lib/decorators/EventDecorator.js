var inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator'),
  eventWrap = require('../util').eventWrap;

module.exports = EventDecorator;

/**
 * Decorator which is responsible
 * for wrapping the cache functions
 * in :before / :after events.
 *
 * @param {Cache} cache
 * @param {Object} [config]
 */

function EventDecorator(cache) {
  BaseDecorator.call(this, cache);
}

inherits(EventDecorator, BaseDecorator);

/**
 * Get and wrap with emit
 *
 * @param {String} key
 * @param {String} value
 * @param {Function} cb
 */

EventDecorator.prototype.get = function (key, cb) {
  var gotValue = function (err, value) {
    if (err) return cb(err);
    if (value === null) this.emit('get:miss', key);
    else this.emit('get:hit', key);
    cb(null, value);
  };

  gotValue = eventWrap(this, 'get', [key], gotValue);

  this._cache.get(key, gotValue);
};

/**
 * Set and wrap with emit
 *
 * @param {String} key
 * @param {String} value
 * @param {Function} cb
 */

EventDecorator.prototype.set = function (key, value, cb) {
  cb = eventWrap(this, 'set', [key, value], cb);
  this._cache.set(key, value, cb);
};

/**
 * Del and wrap with emit
 *
 * @param {String} key
 * @param {String} value
 * @param {Function} cb
 */

EventDecorator.prototype.del = function (key, cb) {
  cb = eventWrap(this, 'del', [key], cb);
  this._cache.del(key, cb);
};
