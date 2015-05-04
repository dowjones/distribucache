var StoreFacade = require('./_all').StoreFacade,
  async = require('async'),
  sinon = require('sinon'),
  stub = sinon.stub,
  spy = sinon.spy;

describe('StoreFacade', function () {
  var unit, store, api;

  beforeEach(function () {
    function noop() {}

    api = {
      createLease: noop,
      createTimer: noop,
      expire: noop,
      del: noop,
      get: noop,
      set: noop,
      on: noop
    };

    store = stub(api);

    unit = new StoreFacade(store, 'n');

    unit._toStoreKey = spy(unit, '_toStoreKey');
  });

  it('should use _toStoreKey for simple methods', function (done) {
    var simpleMethods = Object.keys(StoreFacade.prototype).filter(function (name) {
      return (name !== 'createLease' && name !== 'createTimer'  &&
        name !== 'on' && name[0] !== '_');
    });

    function test(methodName, cb) {
      var isSetter = (methodName.indexOf('set') === 0),
        args = ['k'];

      if (isSetter) args.push('v');
      args.push(check);

      function check(err) {
        if (err) return cb(err);
        unit._toStoreKey.calledOnce.should.be.ok;
        unit._toStoreKey.reset();
        cb();
      }

      if (/^get/.test(methodName)) store.get.yields(null);
      else if (/^set/.test(methodName)) store.set.yields(null);
      else store[methodName].yields(null);

      unit[methodName].apply(unit, args);
    }

    async.map(simpleMethods, test, done);
  });

  it('should use _toStoreKey for createLease', function (done) {
    var storeLease, namespacedLease;

    storeLease = stub();
    storeLease.yields(null);
    store.createLease.returns(storeLease);

    namespacedLease = unit.createLease();
    namespacedLease('k', function () {
      unit._toStoreKey.calledOnce.should.be.ok;
      unit._toStoreKey.reset();
      done();
    });
  });

  it('should proxy on events', function (done) {
    store.on.yields('blah');
    unit.on('error', function (val) {
      val.should.equal('blah');
      done();
    });
  });

  it('should proxy createTimer', function () {
    unit.createTimer();
    store.createTimer.calledOnce;
    store.createTimer.lastCall.args[0].should.equal('n');
  });

  describe('methods that expect numbers back', function () {
    it('should yield an error if the store returns an error', function (done) {
      store.get.yields('e');
      unit.getAccessedAt(null, function (err) {
        err.should.equal('e');
        done();
      });
    });

    it('should yield a number if the store returns a string', function (done) {
      store.get.yields(null, '77');
      unit.getCreatedAt(null, function (err, val) {
        val.should.equal(77);
        done(err);
      });
    });

    it('should yield a number if the store returns a number', function (done) {
      store.get.yields(null, 33);
      unit.getAccessedAt(null, function (err, val) {
        val.should.equal(33);
        done(err);
      });
    });
  });
});
