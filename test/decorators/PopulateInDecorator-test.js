var proxyquire = require('proxyquire').noCallThru(),
  stub = require('sinon').stub,

  joi = require('joi');

describe('PopulateInDecorator', function () {
  var PopulateInDecorator, unit, cache, noop,
    redisClient, lockr, lease, listener;

  beforeEach(function () {
    var modulePath;

    function noop() {}
    cache = stub({
      on: noop,
      emit: noop,
      poopulate: noop,
      _getClient: noop,
      _getDataKey: noop,
      _createRedisClient: noop,
      get: noop,
      del: noop,
      set: noop
    });

    redisClient = stub({hset: noop, hget: noop, psetex: noop});
    cache._getClient.returns(redisClient);

    lease = stub();
    lockr = stub();
    lockr.returns(lease);

    listener = stub({listen: noop, on: noop});
    var ExpiryListener = function () {};
    ExpiryListener.prototype = listener;

    modulePath = '../../lib/decorators/PopulateInDecorator';
    PopulateInDecorator = proxyquire(modulePath, {
      'redis-lockr': lockr,
      '../ExpiryListener': ExpiryListener
    });

    unit = new PopulateInDecorator(cache, redisClient, {
      populateIn: 1000,
      pausePopulateIn: 2000
    });
  });

  it('should create with a namespace', function () {
    new PopulateInDecorator(cache, redisClient,{
      populateIn: 1000,
      pausePopulateIn: 2000,
      namespace: 'n'
    });
  });

  it('should set accessedAt', function () {
    redisClient.hset.yields(null);
    unit.setAccessedAt('k');
    redisClient.hset.calledOnce.should.be.ok;
  });

  it('should set a trigger', function () {
    redisClient.psetex.yields(null);
    unit.setTrigger('k');
    redisClient.psetex.calledOnce.should.be.ok;
  });

  describe('on expired event', function () {
    it('should not populate if paused', function () {
      var onExpiredEvent = listener.on.lastCall.args[1];
      redisClient.hget.yields(null, 1);
      onExpiredEvent('k');
    });

    it('should populate if no accessedAt', function (done) {
      var onExpiredEvent = listener.on.lastCall.args[1];
      redisClient.hget.yields(null, null);
      cache.populate = function (k, cb) { cb(null); };

      lease.yields(null, done);
      onExpiredEvent('k');
    });

    it('should populate if recently accessed', function (done) {
      var onExpiredEvent = listener.on.lastCall.args[1];
      redisClient.hget.yields(null, Date.now());
      cache.populate = function (k, cb) { cb(null); };

      lease.yields(null, done);
      onExpiredEvent('k');
    });

    it('should do nothing if locked', function () {
      var onExpiredEvent = listener.on.lastCall.args[1];
      redisClient.hget.yields(null, Date.now());
      lease.yields(new Error('Exceeded max retry count'));
      onExpiredEvent('k');
    });

    it('should emit an error if lock returns an unknown', function (done) {
      var onExpiredEvent = listener.on.lastCall.args[1];
      redisClient.hget.yields(null, Date.now());

      lease.yields(new Error('bad error'));
      onExpiredEvent('k');

      setTimeout(function () {
        cache.emit.lastCall.args[0].should.equal('error');
        done();
      }, 5);
    });

    it('should emit an error if populate returns one', function (done) {
      var onExpiredEvent = listener.on.lastCall.args[1];
      redisClient.hget.yields(null, Date.now());
      cache.populate = function (k, cb) { cb(new Error('boo')); };
      lease.yields(null, function () {
        cache.emit.lastCall.args[0].should.equal('error');
        done();
      });
      onExpiredEvent('k');
    });
  });
});
