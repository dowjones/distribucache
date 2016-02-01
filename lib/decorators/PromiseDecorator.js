var promisify = require('es6-promisify'),
  inherits = require('util').inherits,
  BaseDecorator = require('./BaseDecorator');

module.exports = PromiseDecorator;

/**
 * If no callbacks are provided to
 * get, set or del a Promise will
 * be returned.
 */

function PromiseDecorator(cache) {
  BaseDecorator.call(this, cache);
  this.get = promisify(this.get.bind(this));
  this.set = promisify(this.set.bind(this));
  this.del = promisify(this.del.bind(this));
}

inherits(PromiseDecorator, BaseDecorator);
