var joi = require('joi'),
  async = require('async'),
  inherits = require('util').inherits,
  isPromise = require('is-promise'),
  BaseDecorator = require('./BaseDecorator'),
  completeWithin = require('../util').completeWithin,
  eventWrap = require('../util').eventWrap;


module.exports = PopulateDecorator;

/**
 * Self-populating data-store independent cache
 *
 * @param {Cache} cache
 * @param {Object} config
 * @param {Function} config.populate
 * @param {Number} [config.leaseExpiresIn] in ms
 * @param {Number} [config.timeoutPopulateIn] in ms, defaults to 30sec
 */

function PopulateDecorator(cache, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    populate: joi.func().required(),
    timeoutPopulateIn: joi.number().integer().default(1000 * 30),
    leaseExpiresIn: joi.number().integer()
  }));
  this._store = this._getStore();
  this._lease = this._store.createLease(
    this._config.leaseExpiresIn || this._config.timeoutPopulateIn + 1000);
  this.on('get:stale', this._onStaleEvent.bind(this));
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
    function returnOrPopulate(value, cbi) {
      if (value !== null) return cbi(null, value);
      self.populate(key, cbi);
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
  var self = this,
    value;

  cb = eventWrap(this, 'populate', [key], cb);

  async.waterfall([
    function populate(cbi) {
      cbi = completeWithin(self._config.timeoutPopulateIn, cbi);
      try {
        var p = self._config.populate(key, cbi);
        if (isPromise(p)) p.catch(cbi).then(cbi.bind(null, null));
      } catch (e) {
        e.message = 'populate threw an error; cause: ' + e.message;
        cbi(e);
      }
    },

    function setValue(populateValue, cbi) {
      value = populateValue;
      self.set(key, value, cbi);
    }
  ], function (err) {
    if (err) {
      err.name = 'PopulateError';
      err.message = 'failed to populate key "' + key + '"; ' +
        'cause: ' + err.message;
      return cb(err);
    }
    cb(null, value);
  });
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

  function critical(error, release) {
    if (error) {
      if (error.name === 'AlreadyLeasedError') return cb(null);
      return cb(error);
    }

    self.populate(key, function (err, value) {
      release();
      cb(err, value);
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
