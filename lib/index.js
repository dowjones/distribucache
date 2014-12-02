var requireDir = require('require-directory'),
  Cache = require('./Cache'),
  deco = requireDir(module, './decorators');

/**
 * Create a new Cache, decorated
 * with the desired features,
 * based on the provided config.
 *
 * @param {Object} [config]
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

exports.create = function (config) {
  var cache;

  config = config || {};

  cache = new Cache({
    host: config.host,
    port: config.port,
    password: config.password,
    namespace: config.namespace
  });

  if (!config.optimizeForSmallValues) {
    cache = new deco.OnlySetChangedDecorator(cache);
  }

  if (config.expiresIn || config.staleIn) {
    cache = new deco.ExpireDecorator(cache, {
      expiresIn: config.expiresIn,
      staleIn: config.staleIn
    });
  }

  if (config.populate) {
    cache = new deco.PopulateDecorator(cache, {
      populate: config.populate
    });

    if (config.populateIn) {
      cache = new deco.PopulateInDecorator(cache, {
        populateIn: config.populateIn,
        pausePopulateIn: config.pausePopulateIn,
        leaseExpiresIn: config.leaseExpiresIn,
        accessedAtThrottle: config.accessedAtThrottle,
        namespace: config.namespace
      });
    }
  }

  return cache;
};