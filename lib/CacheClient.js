var assert = require('assert'),
  _ = require('lodash'),
  requireDir = require('require-directory'),
  Cache = require('./Cache'),
  deco = requireDir(module, './decorators'),
  util = require('./util');

module.exports = CacheClient;

/**
 * Create a new cache client,
 * decorated with the desired features,
 * based on the provided config.
 *
 * @constructor
 * @param {Object} [config]
 *
 * @param {Boolean} [config.isPreconfigured] defaults to false
 *
 * @param {String} [config.host] defaults to 'localhost'
 * @param {Number} [config.port] defaults to 6379
 * @param {String} [config.password]
 * @param {String} [config.namespace]
 *
 * @param {String} [config.optimizeForSmallValues] defaults to false
 *
 * @param {String} [config.expiresIn] in ms
 * @param {String} [config.staleIn] in ms
 *
 * @param {Function} [config.populate]
 *
 * @param {Number} [config.populateIn] in ms, defaults to 30sec
 * @param {Number} [config.pausePopulateIn] in ms
 * @param {Number} [config.leaseExpiresIn] in ms
 * @param {Number} [config.accessedAtThrottle] in ms
 * @param {Number} [config.namespace]
 */

function CacheClient(config) {
  this._config = config || {};
  this._redisClient = util.createRedisClient(this._config);
  this._redisSubClient = util.createRedisClient(this._config);
  if (!this._config.isPreconfigured) {
    util.ensureKeyspaceNotifications(
      this._redisSubClient, util.logError);
  }
}

/**
 * Create a new Cache
 *
 * @param {String} namespace
 * @param {Object} config @see CacheClient constructor
 */

CacheClient.prototype.create = function (namespace, config) {
  var cache;

  assert(namespace, 'namespace must be set');
  namespace = util.createNamespace(this._config.namespace, namespace);
  config = _.defaults(config || {}, this._config);

  cache = new Cache(this._redisClient, {
    namespace: namespace
  });

  if (!config.optimizeForSmallValues) {
    cache = new deco.OnlySetChangedDecorator(cache);
  }

  cache = new deco.MarshallDecorator(cache);

  if (config.expiresIn || config.staleIn) {
    cache = new deco.ExpireDecorator(cache, {
      expiresIn: config.expiresIn,
      staleIn: config.staleIn
    });
  }

  if (config.populate) {
    cache = new deco.PopulateDecorator(cache, {
      populate: config.populate,
      leaseExpiresIn: config.leaseExpiresIn
    });

    if (config.populateIn) {
      cache = new deco.PopulateInDecorator(cache, this._redisSubClient, {
        namespace: namespace,
        populateIn: config.populateIn,
        pausePopulateIn: config.pausePopulateIn,
        accessedAtThrottle: config.accessedAtThrottle
      });
    }
  }

  return cache;
};
