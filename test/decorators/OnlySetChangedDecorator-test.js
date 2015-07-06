var all = require('../_all'),
  util = all.util,
  OnlySetChangedDecorator = all.decorators.OnlySetChangedDecorator,
  stub = require('sinon').stub;

describe('decorators/OnlySetChangedDecorator', function () {
  var unit, cache, store;

  beforeEach(function () {
    function noop() {}
    cache = stub({
      on: noop,
      emit: noop,
      _getStore: noop,
      get: noop,
      del: noop,
      set: noop
    });
    store = stub({
      getHash: noop,
      setHash: noop
    });
    cache._getStore.returns(store);
    unit = new OnlySetChangedDecorator(cache, {});
  });

  describe('set', function () {
    it('should call set when the hash does not match', function (done) {
      store.getHash.yields(null, 'h');
      cache.set.yields(null);
      unit.set('k', 'v', function () {
        process.nextTick(function () {
          store.getHash.calledOnce.should.be.ok();
          done();
        });
      });
    });

    it('should not call set but emit set when hash matches (same val)', function (done) {
      store.getHash.yields(null, util.createHash('v'));
      cache.set.yields(null);
      unit.set('k', 'v', function () {
        process.nextTick(function () {
          cache.emit.firstCall.args[0].should.equal('set');
          done();
        });
      });
    });

    it('should not set hash if set had an error', function (done) {
      store.getHash.yields(null, 'h');
      cache.set.yields(new Error('bad'));
      unit.set('k', 'v', function () {
        process.nextTick(function () {
          store.setHash.calledOnce.should.not.be.ok();
          done();
        });
      });
    });
  });
});
