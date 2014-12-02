var joi = require('joi');

module.exports = BaseDecorator;

/**
 * The root of the Decorator tree
 * @constructor
 */

function BaseDecorator(cache, config, configSchema) {
  this._cache = cache;
  this._configSchema = configSchema;
  this._config = this._validateConfig(configSchema, config || {});
}

;[
  // BaseCache
  'get', 'set', 'del',

  // EventEmitter
  'addListener', 'on', 'once', 
  'removeListener', 'removeAllListeners',
  'setMaxListeners', 'listeners', 'emit'
].forEach(function (methodName) {
  BaseDecorator.prototype[methodName] = function () {
    this._cache[methodName].apply(this._cache, arguments);
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
