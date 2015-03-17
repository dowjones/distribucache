var BaseDecorator = require('../_all').decorators.BaseDecorator,
  stub = require('sinon').stub,
  joi = require('joi');

describe('decorators/BaseDecorator', function () {
  var cache, noop;

  beforeEach(function () {
    function noop() {}
    cache = stub({emit: noop, on: noop});
  });

  it('should create a basic dec', function () {
    new BaseDecorator(cache);
  });

  describe('_emitError', function () {
    it('should emit an error on error or do nothing', function () {
      var d = new BaseDecorator(cache);
      d._emitError(new Error('bad'));
      cache.emit.calledOnce.should.be.ok;
    });

    it('should not emit an error when none is sent', function () {
      var d = new BaseDecorator(cache);
      d._emitError(null);
      cache.emit.calledOnce.should.not.be.ok;
    });
  });

  it('should create a dec with a config', function () {
    new BaseDecorator(cache, {}, joi.object().keys({}));
  });

  it('should throw on invalid config', function () {
    (function () {
      new BaseDecorator(cache, {boo: 1}, joi.object().keys({}));
    }).should.throw(/not allowed/);
  });

  it('should change human intervals in config', function () {
    new BaseDecorator(cache, {
      aIn: '1 min',
      b: 'hello'
    }, joi.object().keys({
      aIn: joi.number(),
      b: joi.string()
    }));
  });
});
