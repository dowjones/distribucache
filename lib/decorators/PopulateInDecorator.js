var joi = require('joi'),
  async = require('async'),
  throttle = require('lodash').throttle,
  lockr = require('redis-lockr'),
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
 * @param {String} [config.leaseExpiresIn] in ms
 * @param {String} [config.namespace] in ms
 */

function PopulateInDecorator(cache, subClient, config) {
  BaseDecorator.call(this, cache, config, joi.object().keys({
    populateIn: joi.number().integer().min(500).required(),
    pausePopulateIn: joi.number().integer().required(),
    leaseExpiresIn: joi.number().integer().default(300),
    accessedAtThrottle: joi.number().integer().default(1000),
    namespace: joi.string()
  }));

  this._nsp = this._config.namespace ? this._config.namespace + ':' : '';

  this._lease = lockr(this._getClient(), {
    lifetime: this._config.leaseExpiresIn
  });

  this._listener = new ExpiryListener(subClient, {
    keyspace: this._nsp + '*:trigger'
  });

  this.on('set', this.setTrigger.bind(this));
  this.on('get', throttle(this.setAccessedAt.bind(this),
    this._config.accessedAtThrottle));

  this._listener.on('error', this._emitError);
  this._listener.on('expired', this._onTrigger.bind(this));
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
 * Called when a trigger is triggered...
 *
 * @private
 * @param {String} key
 */

PopulateInDecorator.prototype._onTrigger = function (key) {
  var client = this._getClient(),
    self = this;

  async.waterfall([
    client.hget.bind(client, this._getDataKey(key), 'accessedAt'),
    function (accessedAt, cb) {
      if (accessedAt) {
        accessedAt = parseInt(accessedAt, 10);
        // don't populate if the cache is not used
        if (accessedAt + self._config.pausePopulateIn < Date.now()) return;
      }
      self._leasedPopulate(key);
    }
  ], this._emitError);
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
