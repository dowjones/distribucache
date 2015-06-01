var joi = require('joi'),
  async = require('async'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator'),
  createHash = require('../util').createHash;

module.exports = OnlySetChangedDecorator;

/**
 * Decorator which only actually update the value
 * if the value has changed.
 *
 * @param {Cache} cache
 * @param {Object} [config]
 */

function OnlySetChangedDecorator(cache) {
  BaseDecorator.call(this, cache);
}

inherits(OnlySetChangedDecorator, BaseDecorator);

/**
 *
 * @param {String} key
 * @param {String} value
 * @param {Function} cb
 */

OnlySetChangedDecorator.prototype.set = function (key, value, cb) {
  var cache = this._cache,
    store = cache._getStore(),
    self = this;

  async.waterfall([
    store.getHash.bind(store, key),

    function maybeSet(existingHash, cb) {
      var newHash = createHash(value);

      // only emit the `set` event (which happens before the set)
      // don't set the actual value
      if (newHash === existingHash) {
        self.emit('set', key);
        return cb(null);
      }

      function setHash(err) {
        if (err) return cb(err);
        store.setHash(key, newHash, self._emitError);
        cb(null);
      }

      cache.set(key, value, setHash);
    }
  ], cb);
};
