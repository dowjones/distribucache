var joi = require('joi'),
  async = require('async'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator'),
  completeWithin = require('../util').completeWithin,
  errorHelpers = require('common-errors').helpers,
  PopulateError = errorHelpers.generateClass('PopulateError');

module.exports = PopulateDecorator;

/**
 * Self-populating Redis-backed cache
 *
 * @param {Cache} cache
 * @param {Object} config
 * @param {Function} config.populate
 * @param {Number} [config.leaseExpiresIn] in ms
 * @param {Number} [config.populateTimeout] in ms, defaults to 30sec
 */

function PopulateDecorator(cache, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    populate: joi.func().required(),
    leaseExpiresIn: joi.number().integer().default(300),
    populateTimeout: joi.number().integer().default(1000 * 30)
  }));
  this._store = this._getStore();
  this._lease = this._store.createLease(this._config.leaseExpiresIn);
  this.on('stale', this._onStaleEvent.bind(this));
}

inherits(PopulateDecorator, BaseDecorator);

/**
 * Get a value from the cache.
 *
 * @param {String} key
 * @param {Function} cb
 */

PopulateDecorator.prototype.get = function (key, cb) {
  var self = this;
  async.waterfall([
    this._cache.get.bind(this._cache, key),
    function returnOrPopulate(value, cb) {
      if (value) return cb(null, value);
      self.populate(key, cb);
    }
  ], cb);
};

/**
 * Populate a value into the cache
 *
 * @param {String} key
 * @param {Function} cb
 */

PopulateDecorator.prototype.populate = function (key, cb) {
  var self = this;
  async.waterfall([
    function populate(cb) {
      cb = completeWithin(self._config.populateTimeout, cb);
      try {
        self._config.populate(key, cb);
      } catch (e) {
        e.message = 'populate threw an error; cause: ' + e.message;
        cb(e);
      }
    },
    this.set.bind(this, key)
  ], cb);
};

/**
 * When a trigger is expired, the leasedPopulate
 * method is called. When this happens, a lease
 * is taken out to run the populate method.
 *
 * This is done to ensure that only one populate
 * method is run for all of the processes (as the
 * event will be dispatched to all).
 *
 * @private
 * @param {String} key
 */

PopulateDecorator.prototype.leasedPopulate = function (key, cb) {
  var self = this;

  function critical(err, release) {
    if (err) {
      if ('AlreadyLeasedError' === err.name) return cb(null);
      return cb(err);
    }

    self.populate(key, function (err, value) {
      if (err) return cb(new PopulateError(
        'failed to populate "' + key + '"', err));
      release();
      cb(null, value);
    });
  }

  this._lease(key, critical);
};

/**
 * Called on the `stale` event
 *
 * @private
 * @param {String} key
 */

PopulateDecorator.prototype._onStaleEvent = function (key) {
  this.leasedPopulate(key, this._emitError);
};
