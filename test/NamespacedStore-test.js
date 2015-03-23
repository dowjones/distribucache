var NamespacedStore = require('./_all').NamespacedStore,
  async = require('async'),
  sinon = require('sinon'),
  stub = sinon.stub,
  spy = sinon.spy;

describe('NamespacedStore', function () {
  var unit, store, api;

  beforeEach(function () {
    function noop() {}

    api = {
      createLease: noop,
      createTimer: noop,
      del: noop,
      getAccessedAt: noop,
      getCreatedAt: noop,
      getHash: noop,
      getValue: noop,
      setAccessedAt: noop,
      setCreatedAt: noop,
      setHash: noop,
      setValue: noop,
      on: noop
    };

    store = stub(api);

    unit = new NamespacedStore(store, 'n');

    unit._toStoreKey = spy(unit, '_toStoreKey');
  });

  it('should use _toStoreKey for simple methods', function (done) {
    var simpleMethods = Object.keys(api).filter(function (name) {
      return (name !== 'createLease' && name !== 'createTimer'  && name !== 'on');
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

      store[methodName].yields(null);
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
});
