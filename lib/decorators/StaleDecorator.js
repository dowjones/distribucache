var joi = require('joi'),
  async = require('async'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator'),
  ExpiryListener = require('../ExpiryListener');

module.exports = StaleDecorator;

/**
 * Stale Redis-backed cache
 *
 * @constructor
 * @param {Cache} cache
 * @param {Object} [config]
 * @param {String} [config.expiresIn] in ms
 */

function StaleDecorator(cache, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    staleIn: joi.number().integer().required(),
    leaseTimeout: joi.number().integer(),
    namespace: joi.string()
  }));
  this.on('set', this.setTrigger.bind(this));
  this._listenToExpired();
}

inherits(StaleDecorator, BaseDecorator);

/**
 * Set a timed trigger for a given key.
 * When the trigger expires, the populate
 * method will be called.
 *
 * @param {String} key
 */

StaleDecorator.prototype.setTrigger = function (key) {
  var client = this._cache._getClient(),
    triggerKey = this._getTriggerKey(key);
  client.psetex(triggerKey, this._config.staleIn, '', this._emitError);
};

StaleDecorator.prototype._listenToExpired = function () {
  var subClient = this._createRedisClient(), listener;
  this._expiryListener = listener;
  listener = new ExpiryListener(this._getClient(), subClient, {
    namespace: this._config.namespace,
    leaseTimeout: this._config.leaseTimeout
  });
  listener.on('error', this._emitError);
  listener.on('expired', this._cache.populate.bind(this._cache));
  listener.listen();
};

/**
 * Get the trigger key used to
 * mark cache as stale, and let
 * redis ping the decorator back
 * so that it can re-populate.
 *
 * @private
 * @param {String} key
 * @returns {String}
 */

StaleDecorator.prototype._getTriggerKey = function (key) {
  var nsp = this._config.namespace ? this._config.namespace + ':' : '';
  return nsp + key + ':trigger';
};
