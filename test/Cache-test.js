var Cache = require('./_all').Cache,
  stub = require('sinon').stub,
  spy = require('sinon').spy;

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

  describe('get', function () {
    it('should emit a get event', function (done) {
      var getSpy = spy();
      unit.on('get', getSpy);

      function check() {
        getSpy.calledOnce.should.be.ok();
        done();
      }

      store.getValue.yields(null);
      unit.get('k', check);
    });

    it('should proxy error from hget', function (done) {
      function check(err) {
        err.message.should.equal('handled');
        done();
      }
      store.getValue.yields(new Error('handled'));
      unit.get('k', check);
    });
  });

  describe('set', function () {
    it('should emit a set event', function (done) {
      var setSpy = spy();
      unit.on('set', setSpy);

      function check() {
        setSpy.calledOnce.should.be.ok();
        done();
      }

      store.setValue.yields(null, 'ok');
      unit.set('k', 'v', check);
    });
  });

  describe('del', function () {
    it('should emit a del event', function (done) {
      var delSpy = spy();
      unit.on('del', delSpy);

      function check() {
        delSpy.calledOnce.should.be.ok();
        done();
      }

      store.del.yields(null);
      unit.del('k', check);
    });
  });

  // protected
  describe('_getStore', function () {
    it('should get store', function () {
      unit._getStore().getValue.should.be.type('function');
    });
  });
});
