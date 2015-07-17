var Cache = require('./_all').Cache,
  stub = require('sinon').stub;

describe('Cache', function () {
  var unit, store;

  beforeEach(function () {
    function noop() {}
    store = stub({
      getValue: noop,
      setValue: noop,
      del: noop
    });
    unit = new Cache(store);
  });

  it('should get', function(done) {
    store.getValue.withArgs('k').yields(null);
    unit.get('k', done);
  });

  it('should set', function(done) {
    store.setValue.withArgs('k', 'v').yields(null);
    unit.set('k', 'v', done);
  });

  it('should del', function(done) {
    store.del.withArgs('k').yields(null);
    unit.del('k', done);
  });

  // protected
  describe('_getStore', function () {
    it('should get store', function () {
      unit._getStore().getValue.should.be.type('function');
    });
  });
});
