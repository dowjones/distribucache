var joi = require('joi'),
  intervalToMs = require('../util').intervalToMs,
  TIME_SUFFIX_RE = /.*(?:In)$/;

module.exports = BaseDecorator;

/**
 * The root of the Decorator tree
 * @constructor
 */

function BaseDecorator(cache, config, configSchema) {
  this._cache = cache;

  if (config) {
    this._configSchema = configSchema;
    this._config = this._humanTimeIntervalToMs(config);
    this._config = this._validateConfig(configSchema, this._config);
  }

  // substitute cb, for cases
  // when you don't need a callback, but
  // don't want to loose the error.
  this._emitError = function (err) {
    if (err) this.emit('error', err);
  }.bind(this);
}

[
  // BaseCache
  'get', 'set', 'del', '_getStore',

  // EventEmitter
  'addListener', 'on', 'once',
  'removeListener', 'removeAllListeners',
  'setMaxListeners', 'listeners', 'emit'
].forEach(function (methodName) {
  BaseDecorator.prototype[methodName] = function () {
    return this._cache[methodName].apply(this._cache, arguments);
  };
});

/**
 * Validate the cache via the provided schema.
 * Throw if invalid. Return the value with defaults
 * if valid.
 *
 * @private
 * @param {Object} schema
 * @param {Object} config
 */

BaseDecorator.prototype._validateConfig = function (schema, config) {
  var validation = joi.validate(config, schema);
  if (validation.error) throw validation.error;
  return validation.value;
};

/**
 * Convert all configs with a possible human time interval
 * to a millisecond interval.
 *
 * @param {Object} config
 * @reurn {Object} config
 */

BaseDecorator.prototype._humanTimeIntervalToMs = function (config) {
  Object.keys(config).forEach(function (key) {
    var value = config[key];
    if (!TIME_SUFFIX_RE.test(key) || !value) return;
    config[key] = intervalToMs(value);
  });
  return config;
};
