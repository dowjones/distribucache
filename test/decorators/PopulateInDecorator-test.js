var proxyquire = require('proxyquire').noCallThru(),
  stub = require('sinon').stub,

  joi = require('joi');

describe('PopulateInDecorator', function () {
  var PopulateInDecorator, unit, cache, noop,
    redisClient, listener;

  beforeEach(function () {
    var modulePath;

    function noop() {}
    cache = stub({
      on: noop,
      emit: noop,
      leasedPopulate: noop,
      _getClient: noop,
      _getDataKey: noop,
      get: noop,
      del: noop,
      set: noop
    });

    redisClient = stub({hset: noop, hget: noop, psetex: noop});
    cache._getClient.returns(redisClient);

    listener = stub({listen: noop, on: noop});
    var ExpiryListener = function () {};
    ExpiryListener.prototype = listener;

    modulePath = '../../lib/decorators/PopulateInDecorator';
    PopulateInDecorator = proxyquire(modulePath, {
      '../ExpiryListener': ExpiryListener
    });

    unit = new PopulateInDecorator(cache, redisClient, {
      populateIn: 1000,
      pausePopulateIn: 2000
    });
  });

  it('should set accessedAt', function () {
    redisClient.hset.yields(null);
    unit.setAccessedAt('k');
    redisClient.hset.calledOnce.should.be.ok;
  });

  it('should set a trigger', function () {
    redisClient.psetex.yields(null);
    unit.setTrigger('k');
    redisClient.psetex.calledOnce.should.be.ok;
  });

  it('should call leasedPopulate on expiredEvent', function (done) {
     var onExpiredEvent = listener.on.lastCall.args[1];
     unit.leasedPopulate = function (k, cb) {
       k.should.equal('k');
       cb.should.be.type('function');
       done();
     };
     onExpiredEvent('k');
  });

  describe('leasedPopulate', function () {
    it('should populate if no accessedAt', function (done) {
      redisClient.hget.yields(null, null);
      cache.leasedPopulate.yields(null);
      unit.leasedPopulate('k', done);
    });

    it('should populate if accessedAt and not paused', function (done) {
      redisClient.hget.yields(null, Infinity);
      cache.leasedPopulate.yields(null);
      unit.leasedPopulate('k', done);
    });

    it('should not populate if accessedAt but paused', function (done) {
      redisClient.hget.yields(null, 1);
      unit.leasedPopulate('k', done);
    });
  });
});
