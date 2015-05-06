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
      delProp: noop,
      getProp: noop,
      setProp: noop,
      incrPropBy: noop,
      on: noop
    };

    store = stub(api);

    unit = new StoreFacade(store, 'n');

    unit._toStoreKey = spy(unit, '_toStoreKey');
  });

  it('should use _toStoreKey for simple methods', function (done) {
    var simpleMethods = Object.keys(StoreFacade.prototype).filter(function (name) {
      return (name !== 'createLease' && name !== 'createTimer'  &&
        name !== 'on' && name[0] !== '_' && name !== 'resetPopulateInErrorCount' &&
        name !== 'incrementPopulateInErrorCount');
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

      if (/^get/.test(methodName)) store.getProp.yields(null);
      else if (/^set/.test(methodName)) store.setProp.yields(null);
      else store[methodName].yields(null);

      unit[methodName].apply(unit, args);
    }

    async.map(simpleMethods, test, done);
  });

  describe('populateInErrorCount', function () { 
    it('should be incremented', function (done) {
      function check(err) {
        store.incrPropBy.calledOnce.should.be.ok;
        done(err);
      }
      store.incrPropBy.yields(null);
      unit.incrementPopulateInErrorCount('k', check);
    });

    it('should be deleted when reset', function (done) {
      function check(err) {
        store.delProp.calledOnce.should.be.ok;
        done(err);
      }
      store.delProp.yields(null);
      unit.resetPopulateInErrorCount('k', check);
    });
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
      store.getProp.yields('e');
      unit.getAccessedAt(null, function (err) {
        err.should.equal('e');
        done();
      });
    });

    it('should yield a number if the store returns a string', function (done) {
      store.getProp.yields(null, '77');
      unit.getCreatedAt(null, function (err, val) {
        val.should.equal(77);
        done(err);
      });
    });

    it('should yield a number if the store returns a number', function (done) {
      store.getProp.yields(null, 33);
      unit.getAccessedAt(null, function (err, val) {
        val.should.equal(33);
        done(err);
      });
    });
  });
});
