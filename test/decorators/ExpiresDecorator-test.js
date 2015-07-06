var ExpiresDecorator = require('../_all').decorators.ExpiresDecorator,
  stub = require('sinon').stub;

describe('decorators/ExpiresDecorator', function () {
  var unit, cache, store;

  beforeEach(function () {
    function noop() {}
    cache = stub({
      on: noop,
      emit: noop,
      _getStore: noop,
      get: noop,
      del: noop
    });
    store = stub({
      setCreatedAt: noop,
      getCreatedAt: noop
    });
    cache._getStore.returns(store);
    unit = new ExpiresDecorator(cache, {});
  });

  describe('setCreatedAt', function () {
    it('should set the createdAt timestamp', function () {
      store.setCreatedAt.yields(null);
      unit.setCreatedAt('k');
      store.setCreatedAt.calledOnce.should.be.ok();
    });
  });

  describe('get', function () {
    it('should yield null if createdAt is null (not in cache)', function (done) {
      store.getCreatedAt.yields(null, null);
      unit.get('k', done);
    });

    it('should look at createdAt first and if not expired call get', function (done) {
      store.getCreatedAt.yields(null, '0');
      cache.get.yields(null);
      unit.get('k', done);
    });

    it('should yield null if expired and call del', function (done) {
      store.getCreatedAt.yields(null, '0');
      unit = new ExpiresDecorator(cache, {expiresIn: 0});
      unit.get('k', function () {
        cache.del.called.should.be.ok();
        done();
      });
    });

    it('should call get if stale emit stale', function (done) {
      store.getCreatedAt.yields(null, '0');
      cache.get.yields(null);
      unit = new ExpiresDecorator(cache, {staleIn: 0});
      unit.get('k', function () {
        cache.emit.calledOnce.should.be.ok();
        cache.emit.firstCall.args[0].should.equal('stale');
        done();
      });
    });
  });
});
