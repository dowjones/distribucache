var joi = require('joi'),
  async = require('async'),
  throttle = require('lodash/function/throttle'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator');

module.exports = PopulateInDecorator;

/**
 * Auto-populating Redis-backed cache
 *
 * @constructor
 * @param {Cache} cache
 * @param {Object} [config]
 * @param {String} [config.populateIn] in ms
 * @param {String} [config.namespace] in ms
 */

function PopulateInDecorator(cache, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    populateIn: joi.number().integer().min(500).required(),
    pausePopulateIn: joi.number().integer().required(),
    accessedAtThrottle: joi.number().integer().default(1000)
  }));

  this.on('set', this.setTimeout.bind(this));
  this.on('get', throttle(this.setAccessedAt.bind(this),
    this._config.accessedAtThrottle));

  this._store = this._getStore();
  this._store.on('timeout', this._onTimeout.bind(this));
}

inherits(PopulateInDecorator, BaseDecorator);

/**
 * Set the accessedAt timestamp, to mark
 * the last access timestamp.
 *
 * @param {String} key
 */

PopulateInDecorator.prototype.setAccessedAt = function (key) {
  this._store.setAccessedAt(key, Date.now(), this._emitError);
};

/**
 * Set a timeout for a given key.
 *
 * After the configured `populateIn` time, the `timeout` event
 * will be called, executing the `leasedPopulate` method in turn.
 *
 * @param {String} key
 */

PopulateInDecorator.prototype.setTimeout = function (key) {
  this._store.setTimeout(key, this._config.populateIn,
    this._emitError);
};

/**
 * Populates the cache
 *
 * @param {String} key
 * @param {Function} cb
 */

PopulateInDecorator.prototype.leasedPopulate = function (key, cb) {
  var self = this;

  async.waterfall([
    this._store.getAccessedAt.bind(this._store, key),

    function (accessedAt, cb) {
      if (accessedAt) {
        accessedAt = parseInt(accessedAt, 10);
        // don't populate if the cache is not used
        if (accessedAt + self._config.pausePopulateIn < Date.now()) {
          return cb(null);
        }
      }
      self._cache.leasedPopulate(key, function (err) {
        // when an error occurs, the `set` event will not be called
        // thus, we need to set the timeout manually in order to
        // continue polling
        if (err) self.setTimeout(key);
        cb(err);
      });
    }
  ], cb);
};

/**
 * Called when a `timeout` is emitted
 *
 * @private
 * @param {String} key
 */

PopulateInDecorator.prototype._onTimeout = function (key) {
  this.leasedPopulate(key, this._emitError);
};
