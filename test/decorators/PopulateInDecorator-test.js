var proxyquire = require('proxyquire').noCallThru(),
  stub = require('sinon').stub;

describe('decorators/PopulateInDecorator', function () {
  var PopulateInDecorator, unit, cache, store, timer;

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

    timer = stub({
      on: noop,
      setTimeout: noop
    });

    store = stub({
      on: noop,
      getAccessedAt: noop,
      setAccessedAt: noop,
      createTimer: noop,
      resetPopulateInErrorCount: noop,
      incrementPopulateInErrorCount: noop
    });
    store.createTimer.returns(timer);

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
    store.setAccessedAt.calledOnce.should.be.ok();
  });

  it('should set a trigger', function () {
    timer.setTimeout.yields(null);
    unit.setTimeout('k');
    timer.setTimeout.calledOnce.should.be.ok();
  });

  it('should call leasedPopulate on `timeout`', function (done) {
    var _onTimeout = timer.on.lastCall.args[1];
    unit.leasedPopulate = function (k, cb) {
      k.should.equal('k');
      cb.should.be.type('function');
      done();
    };
    _onTimeout('k');
  });

  describe('leasedPopulate', function () {
    it('should populate if no accessedAt', function (done) {
      store.getAccessedAt.yields(null, null);
      cache.leasedPopulate.yields(null);
      store.resetPopulateInErrorCount.yields(null);
      unit.leasedPopulate('k', done);
    });

    it('should populate if accessedAt and not paused', function (done) {
      store.getAccessedAt.yields(null, Infinity);
      cache.leasedPopulate.yields(null);
      store.resetPopulateInErrorCount.yields(null);
      unit.leasedPopulate('k', done);
    });

    it('should not populate if accessedAt but paused', function (done) {
      store.getAccessedAt.yields(null, 1);
      unit.leasedPopulate('k', done);
    });

    it('should continue to populate despite an error if within attempts', function (done) {
      function check(err) {
        err.message.should.equal('bad');
        timer.setTimeout.calledOnce.should.be.ok();
        done();
      }
      store.getAccessedAt.yields(null, Infinity);
      cache.leasedPopulate.yields(new Error('bad'));
      store.incrementPopulateInErrorCount.yields(null, 1);
      unit.leasedPopulate('k', check);
    });

    it('should not continue to populate despite an error over attempts', function (done) {
      function check(err) {
        err.message.should.equal('bad');
        timer.setTimeout.called.should.not.be.ok();
        done();
      }
      store.getAccessedAt.yields(null, Infinity);
      cache.leasedPopulate.yields(new Error('bad'));
      store.incrementPopulateInErrorCount.yields(null, 5);
      unit.leasedPopulate('k', check);
    });

    it('should continue to populate despite an error', function (done) {
      function check(err) {
        err.message.should.equal('bad');
        timer.setTimeout.calledOnce.should.be.ok();
        done();
      }
      store.getAccessedAt.yields(null, Infinity);
      cache.leasedPopulate.yields(new Error('bad'));
      store.incrementPopulateInErrorCount.yields(null, 1);
      unit.leasedPopulate('k', check);
    });

    it('should propagate an incremement error', function (done) {
      function check(err) {
        err.message.should.equal('inc');
        timer.setTimeout.called.should.not.be.ok();
        done();
      }
      store.getAccessedAt.yields(null, Infinity);
      cache.leasedPopulate.yields(new Error('bad'));
      store.incrementPopulateInErrorCount.yields(new Error('inc'));
      unit.leasedPopulate('k', check);
    });
  });
});
