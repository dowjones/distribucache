var all = require('../_all'),
  util = all.util,
  OnlySetChangedDecorator = all.decorators.OnlySetChangedDecorator,
  stub = require('sinon').stub,
  joi = require('joi');

describe('OnlySetChangedDecorator', function () {
  var unit, cache, noop, redisClient;

  beforeEach(function () {
    function noop() {}
    cache = stub({
      on: noop,
      emit: noop,
      _getClient: noop,
      _getDataKey: noop,
      get: noop,
      del: noop,
      set: noop
    });
    redisClient = stub({hset: noop, hget: noop});
    cache._getClient.returns(redisClient);
    unit = new OnlySetChangedDecorator(cache, {});
  });

  describe('set', function () {
    it('should call set when the hash does not match', function (done) {
      redisClient.hget.yields(null, 'h');
      cache.set.yields(null);
      unit.set('k', 'v', function () {
        process.nextTick(function () {
          redisClient.hset.calledOnce.should.be.ok;
          done();
        });
      });
    });

    it('should call not call set but emit set when hash matches (same val)', function (done) {
      redisClient.hget.yields(null, util.createHash('v'));
      cache.set.yields(null);
      unit.set('k', 'v', function () {
        process.nextTick(function () {
          cache.emit.firstCall.args[0].should.equal('set');
          done();
        });
      });
    });
  });
});
