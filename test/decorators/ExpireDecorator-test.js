var ExpireDecorator = require('../_all').decorators.ExpireDecorator,
  stub = require('sinon').stub,
  joi = require('joi');

describe('ExpireDecorator', function () {
  var unit, cache, noop, redisClient;

  beforeEach(function () {
    function noop() {}
    cache = stub({
      on: noop,
      emit: noop,
      _getClient: noop,
      _getDataKey: noop,
      get: noop,
      del: noop
    });
    redisClient = stub({hset: noop, hget: noop});
    cache._getClient.returns(redisClient);
    unit = new ExpireDecorator(cache, {});
  });

  describe('setCreatedAt', function () {
    it('should set the createdAt timestamp', function () {
      redisClient.hset.yields(null);
      unit.setCreatedAt('k');
      redisClient.hset.calledOnce.should.be.ok;
    });
  });

  describe('get', function () {
    it('should yield null if createdAt is null (not in cache)', function (done) {
      redisClient.hget.yields(null, null);
      unit.get('k', done);
    });

    it('should look at createdAt first and if not expired call get', function (done) {
      redisClient.hget.yields(null, '0');
      cache.get.yields(null);
      unit.get('k', done);
    });

    it('should yield null if expired and call del', function (done) {
      redisClient.hget.yields(null, '0');
      unit = new ExpireDecorator(cache, {expiresIn: 0});
      unit.get('k', function () {
        cache.del.called.should.be.ok;
        done();
      });
    });

    it('should call get if stale emit stale', function (done) {
      redisClient.hget.yields(null, '0');
      cache.get.yields(null);
      unit = new ExpireDecorator(cache, {staleIn: 0});
      unit.get('k', function () {
        cache.emit.calledOnce.should.be.ok;
        cache.emit.firstCall.args[0].should.equal('stale');
        done();
      });
    });
  });
});
