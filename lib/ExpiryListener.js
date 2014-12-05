var async = require('async'),
  defaults = require('lodash').defaults,
  joi = require('joi'),
  EventEmitter = require('events').EventEmitter,
  inherits = require('util').inherits;

module.exports = ExpiryListener;

/**
 * Listen to expiring keys in Redis
 *
 * Emits events:
 *   - listen - when listening to expiring keys
 *   - stop - stopped listening
 *   - expire - called when a key expires
 *       arguments: ({String} key, {Function} unlock)
 *       call the 'unlock' function when done.
 *
 * @constructor
 * @param {RedisClient} subClient
 * @param {Object} [config]
 * @param {String} [config.keyspace]
 */

function ExpiryListener(subClient, config) {
  EventEmitter.call(this);
  config = this._validateConfig(config || {});
  this._subClient = subClient;
  this._channel = '__keyspace@0__:' + config.keyspace;
}

inherits(ExpiryListener, EventEmitter);

/**
 * Enable redis keyspace events and
 * subscribe to the trigger events
 */

ExpiryListener.prototype.listen = function () {
  var client = this._subClient;
  client.psubscribe(this._channel);
  client.on('pmessage', this._onExpiry.bind(this));
  this.emit('listen');
};

/**
 * Stop listening to keyspace expiry events.
 */

ExpiryListener.prototype.stopListening = function () {
  var self = this;
  function emitEvent(err) {
    if (err) self.emit('error', err);
    self.emit('stop');
  }
  this._subClient.punsubscribe(self._channel, emitEvent);
};

/**
 * Validate and set defaults on the config.
 * Throw if the config is invalid.
 */

ExpiryListener.prototype._validateConfig = function (config) {
  var validation = joi.validate(config, joi.object().keys({
    keyspace: joi.string().required()
  }));
  if (validation.error) throw validation.error;
  return validation.value;
};

/**
 * On every event, emit the `expired` event with the key
 */

ExpiryListener.prototype._onExpiry = function (pattern, channel, message) {
  var chan, cacheKey;

  if ('expired' !== message ||
      this._channel !== pattern) return;

  chan = channel.split(':');
  cacheKey = chan[chan.length - 2];

  this.emit('expired', cacheKey);
};
