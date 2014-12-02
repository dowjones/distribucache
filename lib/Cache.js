var EventEmitter = require('events').EventEmitter,
  inherits = require('util').inherits,
  joi = require('joi'),
  async = require('async'),
  redis = require('redis'),
  createHash = require('./util').createHash;

module.exports = Cache;

/**
 * Basic Redis-backed cache
 *
 * @param {Object} [config]
 * @param {String} [config.host] defaults to 'localhost'
 * @param {Number} [config.port] defaults to 6379
 * @param {String} [config.password]
 * @param {String} [config.namespace]
 */

function Cache(config) {
  EventEmitter.call(this);
  config = this._validateConfig(config || {});
  this._config = config;
  this._nsp = config.namespace ? config.namespace + ':' : '';
  this._client = this._createRedisClient();
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
 * Create a new Redis client
 *
 * @protected
 * @returns {RedisClient} redisClient
 */

Cache.prototype._createRedisClient = function () {
  var client = redis.createClient(this._config.port, this._config.host);
  if (this._config.password) client.auth(this._config.password);
  return client;
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
    host: joi.string().default('localhost'),
    port: joi.number().integer().default(6379),
    password: joi.string(),
    namespace: joi.string()
  }));
  if (validation.error) throw validation.error;
  return validation.value;
};
