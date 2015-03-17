var EventEmitter = require('events').EventEmitter,
  inherits = require('util').inherits,
  assert = require('assert'),
  assign = require('lodash/object/assign'),
  requireDir = require('require-directory'),
  Cache = require('./Cache'),
  deco = requireDir(module, './decorators'),
  util = require('./util'),
  PROPAGATED_EVENT_NAMES = ['error', 'get', 'set', 'del', 'stale'];

module.exports = CacheClient;

/**
 * Create a new cache client,
 * decorated with the desired features,
 * based on the provided config.
 *
 * @constructor
 * @param {Store} store
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
 * @param {String} [config.stopEventPropagation] defaults to false
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

function CacheClient(store, config) {
  EventEmitter.call(this);

  this._store = store;
  this._config = config || {};

  util.propagateEvent(this._store, this, 'error');
  this.on('error', unhandledErrorListener);
}

inherits(CacheClient, EventEmitter);

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
  config = assign({}, this._config, config);

  cache = new Cache(this._store, {
    namespace: namespace
  });

  if (!config.optimizeForSmallValues) {
    cache = new deco.OnlySetChangedDecorator(cache);
  }

  cache = new deco.MarshallDecorator(cache);

  if (config.expiresIn || config.staleIn) {
    cache = new deco.ExpiresDecorator(cache, {
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
      cache = new deco.PopulateInDecorator(cache, {
        populateIn: config.populateIn,
        pausePopulateIn: config.pausePopulateIn,
        accessedAtThrottle: config.accessedAtThrottle
      });
    }
  }

  if (!config.stopEventPropagation) {
    util.propagateEvents(cache, this,
      PROPAGATED_EVENT_NAMES, namespace);
  }

  return cache;
};

/**
 * Wrap EventEmitter#on in order to remove the
 * default unhandled-error listener.
 *
 * @param {String} type
 * @param {Function} listener
 */

CacheClient.prototype.on = function (type, listener) {
  if ('error' === type && listener !== unhandledErrorListener) {
    this.removeListener(type, unhandledErrorListener);
  }
  EventEmitter.prototype.on.call(this, type, listener);
};

function unhandledErrorListener(err) {
  console.error('[distribucache] error from an unhandled ' +
    '`error` event:\n', err && err.stack || err);
}
