var EventEmitter = require('events').EventEmitter,
  inherits = require('util').inherits,
  joi = require('joi'),
  async = require('async'),
  redis = require('redis'),
  createHash = require('./util').createHash;

module.exports = Base;

/**
 * Basic Redis-backed cache
 *
 * @param {Object} [config]
 * @param {String} [config.host] defaults to 'localhost'
 * @param {Number} [config.port] defaults to 6379
 * @param {String} [config.password]
 * @param {String} [config.namespace]
 */

function Base(config) {
  EventEmitter.call(this);
  config = this._validateConfig(config || {});
  this._config = config;
  this._nsp = config.namespace ? config.namespace + ':' : '';
  this._client = this._createRedisClient(
    config.port, config.host, config.password);
}

inherits(Base, EventEmitter);

/**
 * Get key from cache
 *
 * @param {String} key
 * @param {Function} cb
 */

Base.prototype.get = function (key, cb) {
  this._client.hget(this._getDataKey(key), 'value', cb);
};

/**
 * Set a new object into the cache
 *
 * @param {String} key
 * @param {Object} value
 * @param {Function} cb
 */

Base.prototype.set = function (key, value, cb) {
  async.waterfall([
    this._client.hset.bind(this._client, this._getDataKey(key),
      'value', value),
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

Base.prototype.del = function (key, cb) {
  this._client.del(this._getDataKey(key), cb);
};

/**
 * Validate and set defaults on the config.
 * Throw if the config is invalid.
 */

Base.prototype._validateConfig = function (config) {
  var validation = joi.validate(config, joi.object().keys({
    host: joi.string().default('localhost'),
    port: joi.number().integer().default(6379),
    password: joi.string(),
    namespace: joi.string()
  }));
  if (validation.error) throw validation.error;
  return validation.value;
};

Base.prototype._createRedisClient = function (port, host, password) {
  var client = redis.createClient(port, host);
  if (password) client.auth(password);
  return client;
};

Base.prototype._getDataKey = function (key) {
  return this._nsp + key + ':data';
};
