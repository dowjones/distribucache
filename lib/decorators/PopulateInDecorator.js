var joi = require('joi'),
  async = require('async'),
  throttle = require('lodash').throttle,
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator'),
  ExpiryListener = require('../ExpiryListener');

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

function PopulateInDecorator(cache, subClient, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    populateIn: joi.number().integer().min(500).required(),
    pausePopulateIn: joi.number().integer().required(),
    accessedAtThrottle: joi.number().integer().default(1000)
  }));

  this._listener = new ExpiryListener(subClient, {
    keyspace: this._nsp + '*:trigger'
  });

  this.on('set', this.setTrigger.bind(this));
  this.on('get', throttle(this.setAccessedAt.bind(this),
    this._config.accessedAtThrottle));

  this._listener.on('error', this._emitError);
  this._listener.on('expired', this._onExpiredEvent.bind(this));
  this._listener.listen();
}

inherits(PopulateInDecorator, BaseDecorator);

/**
 * Set the accessedAt timestamp, to mark
 * the last access timestamp.
 *
 * @param {String} key
 */

PopulateInDecorator.prototype.setAccessedAt = function (key) {
  this._getClient().hset(this._getDataKey(key),
    'accessedAt', Date.now(), this._emitError);
};

/**
 * Set a timed trigger for a given key.
 * When the trigger expires, the populate
 * method will be called.
 *
 * @param {String} key
 */

PopulateInDecorator.prototype.setTrigger = function (key) {
  var client = this._cache._getClient(),
    triggerKey = this._getTriggerKey(key);
  client.psetex(triggerKey, this._config.populateIn, '', this._emitError);
};

/**
 * Populates the cache
 *
 * @param {String} key
 * @param {Function} cb
 */

PopulateInDecorator.prototype.leasedPopulate = function (key, cb) {
  var client = this._getClient(),
    self = this;

  async.waterfall([
    client.hget.bind(client, this._getDataKey(key), 'accessedAt'),

    function (accessedAt, cb) {
      if (accessedAt) {
        accessedAt = parseInt(accessedAt, 10);
        // don't populate if the cache is not used
        if (accessedAt + self._config.pausePopulateIn < Date.now()) {
          return cb(null);
        }
      }
      self._cache.leasedPopulate(key, cb);
    }
  ], cb);
};

/**
 * Get the trigger key used to let
 * Redis ping the decorator back
 * so that it can re-populate.
 *
 * @private
 * @param {String} key
 * @returns {String}
 */

PopulateInDecorator.prototype._getTriggerKey = function (key) {
  return this._nsp + key + ':trigger';
};

/**
 * Called when a expireEvent is emitted
 *
 * @private
 * @param {String} key
 */

PopulateInDecorator.prototype._onExpiredEvent = function (key) {
  this.leasedPopulate(key, this._emitError);
};
