var joi = require('joi'),
  async = require('async');

module.exports = PopulateDecorator;

/**
 * Expire Redis-backed cache
 *
 * @param {Cache} cache
 * @param {Object} config
 * @param {Function} config.populate
 */

function PopulateDecorator(cache, config) {
  this._cache = cache;
  this._config = this._validateConfig(config || {});
}

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
 * Set a value into the cache.
 *
 * @param {String} key
 * @param {Object} value
 * @param {Function} cb
 */

PopulateDecorator.prototype.set = function (key, value, cb) {
  this._cache.set(key, value, cb);
};

/**
 * Remove key from cache.
 *
 * @param {String} key
 * @param {Function} cb
 */

PopulateDecorator.prototype.del = function (key, cb) {
  this._cache.del(key, cb);
};

/**
 * Validate and set defaults on the config.
 * Throw if the config is invalid.
 */

PopulateDecorator.prototype._validateConfig = function (config) {
  var validation = joi.validate(config, joi.object().keys({
    populate: joi.func().required()
  }));
  if (validation.error) throw validation.error;
  return validation.value;
};
