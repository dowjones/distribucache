var joi = require('joi'),
  async = require('async'),
  lockr = require('redis-lockr'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator'),
  ExpiryListener = require('../ExpiryListener');

module.exports = PopulateInDecorator;

/**
 * Stale Redis-backed cache
 *
 * @constructor
 * @param {Cache} cache
 * @param {Object} [config]
 * @param {String} [config.expiresIn] in ms
 */

function PopulateInDecorator(cache, config) {
  var subClient;

  BaseDecorator.call(this, cache, config, joi.object().keys({
    populateIn: joi.number().integer().required(),
    leaseTimeout: joi.number().integer().default(300),
    namespace: joi.string()
  }));

  this._nsp = this._config.namespace ? this._config.namespace + ':' : '';

  this._lease = lockr(this._getClient(), {
    lifetime: this._config.leaseTimeout
  });

  subClient = this._createRedisClient();
  this._listener = new ExpiryListener(subClient, {
    keyspace: this._nsp + '*:trigger'
  });

  this.on('set', this.setTrigger.bind(this));
  this._listener.on('error', this._emitError);
  this._listener.on('expired', this._leasedPopulate.bind(this));
  this._listener.listen();
}

inherits(PopulateInDecorator, BaseDecorator);

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

PopulateInDecorator.prototype._leasedPopulate = function (key) {
  var lockKey, self;

  lockKey = this._nsp + key;
  self = this;

  function critical(err, unlock) {
    if (err) {
      if (!/Exceeded max retry count/.test(err.message)) {
        err.message = 'could not aquire lock for: ' +
          lockKey + '; cause:' + err.message;
        self.emit('error', err);
      }
      return;
    }
    self._cache.populate(key, function (err) {
      if (err) {
        err.message = 'failed to auto-populate; cause:' + err.message;
        self.emit('error', err);
      }
      unlock();
    });
  }

  this._lease(lockKey, critical);
};
