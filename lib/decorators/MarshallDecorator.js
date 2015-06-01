var inherits = require('util').inherits,
  MarshallingError = require('common-errors').helpers
    .generateClass('MarshallingError'),
  BaseDecorator = require('./BaseDecorator');

module.exports = MarshallDecorator;

/**
 * Decorator which takes care of marshalling
 * the data to / from the cache.
 *
 * @param {Cache} cache
 * @param {Object} [config]
 */

function MarshallDecorator(cache) {
  BaseDecorator.call(this, cache);
}

inherits(MarshallDecorator, BaseDecorator);

/**
 * Unmarshall the data and get it
 *
 * @param {String} key
 * @param {String} value
 * @param {Function} cb
 */

MarshallDecorator.prototype.get = function (key, cb) {
  this._cache.get(key, unmarshallWrapper(cb));
};

/**
 * Marshall the value and set it.
 *
 * @param {String} key
 * @param {String} value
 * @param {Function} cb
 */

MarshallDecorator.prototype.set = function (key, value, cb) {
  this._cache.set(key, marshall(value), cb);
};

/**
 * Marshall the value to a string
 *
 * @param {Object} value
 * @return {String}
 */

function marshall(value) {
  if ('undefined' === typeof value) value = null;
  return JSON.stringify(value);
}

/**
 * Unmarshall a previously marshalled value
 * back to its original type / state.
 *
 * @param {String} value - marshalled
 * @return {Object}
 */

function unmarshall(value) {
  var err;
  try {
    value = JSON.parse(value);
  } catch (e) {
    value = ('string' === typeof value) ? value.substr(0, 50) : '';
    err = new MarshallingError('Failed to marshall value: ' + value, e);
  }
  return {error: err, value: value};
}

/**
 * Helper for unmarshalling values
 * provided to a callback.
 *
 * @param {Object} cb
 * @return {Function} (err, marshalledValue)
 */

function unmarshallWrapper (cb) {
  return function (err, value) {
    if (err) return cb(err);
    var m = unmarshall(value);
    cb(m.error, m.value);
  };
}
