var joi = require('joi'),
  async = require('async'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator'),
  completeWithin = require('../util').completeWithin,
  PopulateError = require('common-errors').helpers
    .generateClass('PopulateError');

module.exports = PopulateDecorator;

/**
 * Self-populating Redis-backed cache
 *
 * @param {Cache} cache
 * @param {Object} config
 * @param {Function} config.populate
 * @param {Number} [config.populateTimeout] in ms, defaults to 30sec
 */

function PopulateDecorator(cache, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    populate: joi.func().required(),
    populateTimeout: joi.number().integer().default(1000 * 30)
  }));
  this._populateOnStale();
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
        e.message = 'could not get new value ' +
          'for populate; cause: ' + e.message;
        cb(e);
      }
    },
    this.set.bind(this, key)
  ], cb);
};

/**
 * Listen to `stale` events, and populate
 * the key which is stale.
 */

PopulateDecorator.prototype._populateOnStale = function () {
  var self = this;

  function emitPopulateError(err) {
    if (err) self.emit('error', new PopulateError(err));
  }

  this.on('stale', function (key) {
    self.populate(key, emitPopulateError);
  });
};
