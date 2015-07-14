var joi = require('joi'),
  async = require('async'),
  throttle = require('lodash/function/throttle'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator'),
  eventWrap = require('../util').eventWrap;

module.exports = PopulateInDecorator;

/**
 * Auto-populating Redis-backed cache
 *
 * @constructor
 * @param {Cache} cache
 * @param {Object} [config]
 * @param {String} [config.populateIn]
 * @param {String} [config.populateInAttempts]
 * @param {String} [config.pausePopulateIn]
 * @param {String} [config.accessedAtThrottle]
 */

function PopulateInDecorator(cache, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    populateIn: joi.number().integer().min(500).required(),
    populateInAttempts: joi.number().integer().default(5),
    pausePopulateIn: joi.number().integer().required(),
    accessedAtThrottle: joi.number().integer().default(1000)
  }));

  this._store = this._getStore();
  this._timer = this._store.createTimer();
  this._timer.on('error', this._emitError);
  this._timer.on('timeout', this._onTimeout.bind(this));

  this.on('set:after', this.setTimeout.bind(this));
  this.on('get:after', throttle(this.setAccessedAt.bind(this),
    this._config.accessedAtThrottle));
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
  this._timer.setTimeout(key, this._config.populateIn,
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

  cb = eventWrap(this, 'populateIn', [key], cb);

  async.waterfall([
    this._store.getAccessedAt.bind(this._store, key),

    function (accessedAt, cbi) {
      if (accessedAt) {
        // don't populate if the cache is not used
        if (accessedAt + self._config.pausePopulateIn < Date.now()) {
          return cbi(null);
        }
      }

      function maybeContinuePopulateIn(err) {
        if (!err) return self._store.resetPopulateInErrorCount(key, cbi);

        function maybeSetTimeout(incrErr, value) {
          if (incrErr) return cbi(incrErr);
          if (value < self._config.populateInAttempts) {
            self.setTimeout(key);
          }
          cbi(err);
        }

        self._store.incrementPopulateInErrorCount(key, maybeSetTimeout);
      }

      self._cache.leasedPopulate(key, maybeContinuePopulateIn);
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
