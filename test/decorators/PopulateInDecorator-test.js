var proxyquire = require('proxyquire').noCallThru(),
  stub = require('sinon').stub,
  joi = require('joi');

describe('decorators/PopulateInDecorator', function () {
  var PopulateInDecorator, unit, cache, noop, store;

  beforeEach(function () {
    var modulePath;

    function noop() {}
    cache = stub({
      on: noop,
      emit: noop,
      leasedPopulate: noop,
      _getStore: noop,
      get: noop,
      del: noop,
      set: noop
    });

    store = stub({
      on: noop,
      getAccessedAt: noop,
      setAccessedAt: noop,
      setTimeout: noop
    });
    cache._getStore.returns(store);

    modulePath = '../../lib/decorators/PopulateInDecorator';
    PopulateInDecorator = proxyquire(modulePath, {
    });

    unit = new PopulateInDecorator(cache, {
      populateIn: 1000,
      pausePopulateIn: 2000
    });
  });

  it('should set accessedAt', function () {
    store.setAccessedAt.yields(null);
    unit.setAccessedAt('k');
    store.setAccessedAt.calledOnce.should.be.ok;
  });

  it('should set a trigger', function () {
    store.setTimeout.yields(null);
    unit.setTimeout('k');
    store.setTimeout.calledOnce.should.be.ok;
  });

  it('should call leasedPopulate on expiredEvent', function (done) {
     var onExpiredEvent = store.on.lastCall.args[1];
     unit.leasedPopulate = function (k, cb) {
       k.should.equal('k');
       cb.should.be.type('function');
       done();
     };
     onExpiredEvent('k');
  });

  describe('leasedPopulate', function () {
    it('should populate if no accessedAt', function (done) {
      store.getAccessedAt.yields(null, null);
      cache.leasedPopulate.yields(null);
      unit.leasedPopulate('k', done);
    });

    it('should populate if accessedAt and not paused', function (done) {
      store.getAccessedAt.yields(null, Infinity);
      cache.leasedPopulate.yields(null);
      unit.leasedPopulate('k', done);
    });

    it('should not populate if accessedAt but paused', function (done) {
      store.getAccessedAt.yields(null, 1);
      unit.leasedPopulate('k', done);
    });

    it('should continue to populate despite an error', function (done) {
      function check(err) {
        err.message.should.equal('bad');
        store.setTimeout.calledOnce.should.be.ok;
        done();
      }
      store.getAccessedAt.yields(null, Infinity);
      cache.leasedPopulate.yields(new Error('bad'));
      unit.leasedPopulate('k', check);
    });
  });
});
