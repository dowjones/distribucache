var EventEmitter = require('events').EventEmitter,
  MarshallingError = require('common-errors').helpers
    .generateClass('MarshallingError'),
  inherits = require('util').inherits,
  joi = require('joi'),
  async = require('async'),
  createHash = require('./util').createHash;

module.exports = Cache;

/**
 * Basic Redis-backed cache
 *
 * @param {Object} [config]
 * @param {String} [config.namespace]
 */

function Cache(client, config) {
  EventEmitter.call(this);
  config = this._validateConfig(config || {});
  this._config = config;
  this._nsp = config.namespace ? config.namespace + ':' : '';
  this._client = client;
}

inherits(Cache, EventEmitter);

/**
 * Get key from cache
 *
 * @param {String} key
 * @param {Function} cb
 */

Cache.prototype.get = function (key, cb) {
  this.emit('get', key);
  cb = this._unmarshallWrapper(cb);
  this._client.hget(this._getDataKey(key), 'value', cb);
};

/**
 * Set a new object into the cache
 *
 * @param {String} key
 * @param {Object} value
 * @param {Function} cb
 */

Cache.prototype.set = function (key, value, cb) {
  this.emit('set', key, value);
  async.waterfall([
    this._client.hset.bind(this._client, this._getDataKey(key),
      'value', this._marshall(value)),
    function returnValue(result, cb) {
      cb(null, value);
    }
  ], cb);
};

/**
 * Remove key from cache
 *
 * @param {String} key
 * @param {Function} cb
 */

Cache.prototype.del = function (key, cb) {
  this.emit('del', key);
  this._client.del(this._getDataKey(key), cb);
};

/**
 * Get primary redis client
 *
 * @protected
 * @returns {RedisClient}
 */

Cache.prototype._getClient = function () {
  return this._client;
};

/**
 * Get the name of the "data" key
 * used to get / set / del into Redis.
 *
 * @protected
 * @param {String} key
 * @returns {String} namespaced key
 */

Cache.prototype._getDataKey = function (key) {
  return this._nsp + key + ':data';
};

/**
 * Validate and set defaults on the config.
 * Throw if the config is invalid.
 *
 * @private
 * @param {Object} config
 * @throws {Error} validation
 */

Cache.prototype._validateConfig = function (config) {
  var validation = joi.validate(config, joi.object().keys({
    namespace: joi.string()
  }));
  if (validation.error) throw validation.error;
  return validation.value;
};

/**
 * Marshall the value to a string
 *
 * @param {Object} value
 * @return {String}
 */

Cache.prototype._marshall = function (value) {
  return JSON.stringify(value);
};

/**
 * Unmarshall a previously marshalled value
 * back to its original type / state.
 *
 * @param {String} value - marshalled
 * @return {Object}
 */

Cache.prototype._unmarshall = function (value) {
  var err;
  try {
    value = JSON.parse(value);
  } catch (e) {
    value = ('string' === typeof value) ? value.substr(0, 50) : '';
    err = new MarshallingError('Failed to marshall value: ' + value, e);
  }
  return {error: err, value: value};
};

/**
 * Helper for unmarshalling values
 * provided to a callback.
 *
 * @param {Object} cb
 * @return {Function} (err, marshalledValue)
 */

Cache.prototype._unmarshallWrapper = function (cb) {
  var unmarshall = this._unmarshall;
  return function (err, value) {
    if (err) return cb(err);
    var m = unmarshall(value);
    cb(m.error, m.value);
  };
};
