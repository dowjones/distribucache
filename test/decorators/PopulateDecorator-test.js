var proxyquire = require('proxyquire').noCallThru(),
  stub = require('sinon').stub,
  joi = require('joi');

describe('PopulateDecorator', function () {
  var PopulateDecorator, unit, cache, noop, redisClient,
    populate, lockr, lease;

  beforeEach(function () {
    var modulePath;

    function noop() {}
    cache = stub({
      on: noop,
      emit: noop,
      _getClient: noop,
      _getDataKey: noop,
      get: noop,
      del: noop,
      set: noop
    });
    redisClient = stub({hset: noop, hget: noop});
    cache._getClient.returns(redisClient);

    populate = stub();

    lease = stub();
    lockr = stub();
    lockr.returns(lease);

    modulePath = '../../lib/decorators/PopulateDecorator';
    PopulateDecorator = proxyquire(modulePath, {
      'redis-lockr': lockr
    });

    unit = new PopulateDecorator(cache, {
      populate: populate
    });
  });

  it('should call leasedPopulate on stale event', function (done) {
     var onStaleEvent = cache.on.lastCall.args[1];
     unit.leasedPopulate = function (k, cb) {
       k.should.equal('a');
       cb.should.be.type('function');
       done();
     };
     onStaleEvent('a');
  });

  describe('get', function () {
    it('should return a cached value if in cache', function (done) {
      cache.get.yields(null, 'v');
      unit.get('k', function (err, val) {
        val.should.equal('v');
        done();
      });
    });

    it('should proxy through populate if not in cache', function (done) {
      cache.get.yields(null, null);
      populate.yields(null);
      cache.set.yields(null, 'pv');
      unit.get('k', function (err, val) {
        if (err) return done(err);
        val.should.equal('pv');
        done();
      });
    });
  });

  describe('populate', function () {
    it('should return an error', function (done) {
      unit = new PopulateDecorator(cache, {
        populate: function () {
          throw new Error('bad');
        }
      });
      unit.populate('k', function (err) {
        err.message.should.match(/could not/);
        done();
      });
    });
  });

  describe('leasedPopulate', function () {
    beforeEach(function () {
      unit.populate = stub();
    });

    it('should acquire lock lease, populate, and unlock', function (done) {
      var unlock = stub();
      function check(err, val) {
        if (err) return done(err);
        val.should.equal('v');
        unlock.calledOnce.should.be.ok;
        done();
      }
      lease.yields(null, unlock);
      unit.populate.yields(null, 'v');
      unit.leasedPopulate('k', check);
    });

    it('should not return an error or populate if locked', function (done) {
      lease.yields(new Error('Exceeded max retry count'));
      unit.leasedPopulate('k', done);
    });

    it('should return an error if lock returned one', function (done) {
      function check(err) {
        err.message.should.match(/could not aquire lock/);
        done();
      }
      lease.yields(new Error('bad'));
      unit.leasedPopulate('k', check);
    });

    it('should proxy populate error', function (done) {
      var unlock = stub();
      function check(err, val) {
        err.message.should.match(/failed to populate/);
        done();
      }
      lease.yields(null, unlock);
      unit.populate.yields(new Error('bad'));
      unit.leasedPopulate('k', check);
    });
  });
});
