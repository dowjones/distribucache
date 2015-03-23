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
      del: noop,
      getAccessedAt: noop,
      getCreatedAt: noop,
      getHash: noop,
      getValue: noop,
      setAccessedAt: noop,
      setCreatedAt: noop,
      setHash: noop,
      setValue: noop,
      setTimeout: noop,
      on: noop
    };

    store = stub(api);

    unit = new NamespacedStore(store, 'n');

    unit._toStoreKey = spy(unit, '_toStoreKey');
    unit._fromStoreKey = spy(unit, '_fromStoreKey');
  });

  it('should use _toStoreKey for simple methods', function (done) {
    var simpleMethods = Object.keys(api).filter(function (name) {
      return (name !== 'createLease' && name !== 'on');
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

  describe('on', function () {
    it('should use _fromStoreKey for `on(\'timeout\')`', function (done) {
      store.on.yields('n:k');
      unit.on('timeout', function (key) {
        key.should.equal('k');
        done();
      });
    });

    it('should not use _* for non `timeout` events', function (done) {
      store.on.yields('l');
      unit.on('b', function () {
        unit._toStoreKey.calledOnce.should.not.be.ok;
        unit._fromStoreKey.calledOnce.should.not.be.ok;
        done();
      });
    });
  });
});
