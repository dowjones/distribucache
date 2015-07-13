var proxyquire = require('proxyquire').noCallThru(),
  sinon = require('sinon'),
  stub = sinon.stub,
  spy = sinon.spy;

describe('CacheClient', function () {
  var store, CacheClient, util, unit, deco, c;

  beforeEach(function () {
    function noop() {}

    function Cache() {}
    Cache.prototype = {};
    Cache.prototype.on = spy();

    function Store() {}
    Store.prototype = {};
    Store.prototype.on = spy();

    util = {
      createNamespace: spy(),
      ensureKeyspaceNotifications: spy(),
      propagateEvents: spy(),
      propagateEvent: spy()
    };

    deco = {};
    deco.OnlySetChangedDecorator = spy(Cache);
    deco.MarshallDecorator = spy(Cache);
    deco.EventDecorator = spy(Cache);
    deco.ExpiresDecorator = spy(Cache);
    deco.PopulateDecorator = spy(Cache);
    deco.PopulateInDecorator = spy(Cache);

    CacheClient = proxyquire('../lib/CacheClient', {
      './Cache': Cache,
      './util': util,
      './datastore/redis': Store,
      'require-directory': function () {
        return deco;
      }
    });

    store = stub({on: noop});
  });

  it('should create a preconfigured client', function () {
    unit = new CacheClient(store, {isPreconfigured: true});
    util.ensureKeyspaceNotifications.called.should.not.be.ok();
  });

  describe('create', function () {
    beforeEach(function () {
      unit = new CacheClient();
    });

    it('should create default cache', function () {
      c = unit.create('n');
      c.should.be.type('object');
      deco.OnlySetChangedDecorator.calledOnce.should.be.ok();
    });

    it('should create a small-value optimized cache', function () {
      c = unit.create('n', {optimizeForSmallValues: true});
      c.should.be.type('object');
    });

    it('should create a buffer optimized cache', function () {
      c = unit.create('n', {optimizeForBuffers: true});
      c.should.be.type('object');
    });

    it('should use the expire deco on expiresIn', function () {
      c = unit.create('n', {expiresIn: 200});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok();
      deco.ExpiresDecorator.calledOnce.should.be.ok();
    });

    it('should use the expire deco on staleIn', function () {
      c = unit.create('n', {staleIn: 200});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok();
      deco.ExpiresDecorator.calledOnce.should.be.ok();
    });

    it('should use the populate deco on populate', function () {
      c = unit.create('n', {populate: function () {}});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok();
      deco.PopulateDecorator.calledOnce.should.be.ok();
    });

    it('should use the populateIn deco on populateIn & populate', function () {
      c = unit.create('n', {populateIn: 200, populate: function () {}});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok();
      deco.PopulateDecorator.calledOnce.should.be.ok();
      deco.PopulateInDecorator.calledOnce.should.be.ok();
    });

    it('should not use populateIn without populate', function () {
      c = unit.create('n', {populateIn: 200});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok();
      deco.PopulateInDecorator.calledOnce.should.not.be.ok();
    });

    describe('error event propagation', function () {
      it('should retransmit error events by default', function () {
        c = unit.create('n');
        util.propagateEvents.calledOnce.should.be.ok();
      });

      it('should stop error event propagation if desired', function () {
        c = unit.create('n', {stopEventPropagation: true});
        util.propagateEvents.calledOnce.should.not.be.ok();
      });
    });
  });

  describe('unhandledErrorListener', function () {
    var UNHANDLED_RE = /error from an unhandled/;

    beforeEach(function () {
      unit = new CacheClient();
    });

    it('should call the unhandleErrorListener when `error` is unhandled', function (done) {
      onStderr(function (chunk) {
        chunk.should.match(UNHANDLED_RE);
        done();
      });
      unit.emit('error', 'test unhandled');
    });

    it('should not call the unhandleErrorListener when `error` is handled', function (done) {
      var onerr = onStderr(function (chunk) {
        if (UNHANDLED_RE.test(chunk)) {
          throw new Error('unhandled error listener in use');
        }
      });
      unit.on('error', function () {
        onerr.reset();
        done();
      });
      unit.emit('error', 'test unhandled');
    });
  });
});

/**
 * Note: I don't like this complexity for listening to stderr, but
 * I'd rather have the complexity in the test then in the lib.
 *
 * Please propose a better way, as long as it does not make
 * the implementation more complex.
 */

function onStderr(cb) {
  var write = process.stderr.write;
  process.stderr.write = function (chunk) {
    process.stderr.write = write;
    cb(chunk);
  };
  return {
    reset: function () {
      process.stderr.write = write;
    }
  };
}
