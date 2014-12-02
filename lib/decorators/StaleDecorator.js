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
  var client, subClient;

  BaseDecorator.call(this, cache, config, joi.object().keys({
    staleIn: joi.number().integer().required(),
    leaseTimeout: joi.number().integer(),
    namespace: joi.string()
  }));

  client = this._getClient();
  subClient = this._createRedisClient();

  this._expiryListener = new ExpiryListener(client, subClient, {
    namespace: this._config.namespace,
    leaseTimeout: this._config.leaseTimeout
  });
  this._listen();
}

inherits(StaleDecorator, BaseDecorator);

StaleDecorator.prototype._listen = function () {
  this._cache.on('set', this._setTrigger.bind(this));
  this._expiryListener.on('error', this._emitError);
  this._expiryListener.on('expired', this._cache.populate.bind(this._cache));
  this._expiryListener.listen();
};

StaleDecorator.prototype._setTrigger = function (key) {
  var client = this._cache._getClient(),
    triggerKey = this._getTriggerKey(key);
  client.psetex(triggerKey, this._config.staleIn, '', this._emitError);
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
