var Cache = require('./Cache'),
  ExpireDecorator = require('./decorators/ExpireDecorator'),
  PopulateDecorator = require('./decorators/PopulateDecorator'),
  StaleDecorator = require('./decorators/StaleDecorator');

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
 * @param {String} [config.expiresIn] in ms
 *
 * @param {Function} [config.populate]
 * @param {Number} [config.populateTimeout] in ms, defaults to 30sec
 *
 * @param {String} [config.staleIn] in ms
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

  if (config.expiresIn) {
    cache = new ExpireDecorator(cache, {
      expiresIn: config.expiresIn
    });
  }

  if (config.populate) {
    cache = new PopulateDecorator(cache, {
      populate: config.populate
    });

    if (config.staleIn) {
      cache = new StaleDecorator(cache, {
        staleIn: config.staleIn,
        namespace: config.namespace
      });
    }
  }

  return cache;
};
