var proxyquire = require('proxyquire').noCallThru(),
  stub = require('sinon').stub,
  spy = require('sinon').spy;

describe('Cache', function () {
  var Cache, unit, redis, redisClient;

  beforeEach(function () {
    function noop() {}

    redisClient = stub({hget: noop, hset: noop, del: noop, auth: noop});
    redis = stub({createClient: noop});
    redis.createClient.returns(redisClient);

    Cache = proxyquire('../lib/Cache', {
      redis: redis
    });

    unit = new Cache();
  });

  it('should create a cache without config', function () {
    new Cache({namespace: 'n'});
    (function () {
      new Cache({unknownConfig: 'a'});
    }).should.throw(/unknownConfig/);
  });

  describe('get', function () {
    it('should emit a get event', function (done) {
      var getSpy = spy();
      unit.on('get', getSpy);

      function check() {
        getSpy.calledOnce.should.be.ok;
        done();
      }

      redisClient.hget.yields(null);
      unit.get('k', check);
    });
  });

  describe('set', function () {
    it('should emit a set event', function (done) {
      var setSpy = spy();
      unit.on('set', setSpy);

      function check() {
        setSpy.calledOnce.should.be.ok;
        done();
      }

      redisClient.hset.yields(null, 'ok');
      unit.set('k', 'v', check);
    });
  });

  describe('del', function () {
    it('should emit a del event', function (done) {
      var delSpy = spy();
      unit.on('del', delSpy);

      function check() {
        delSpy.calledOnce.should.be.ok;
        done();
      }

      redisClient.del.yields(null);
      unit.del('k', check);
    });
  });

  describe('_getClient', function () {
    it('should get the redis client', function () {
      unit._getClient().should.equal(redisClient);
    });
  });

  describe('_createRedisClient', function () {
    it('should create a new redis client using the existing config', function () {
      unit._createRedisClient().should.eql(redisClient);
    });

    it('should use auth if a password is configured', function () {
      var client;

      unit = new Cache({password: 'abc'});
      client = unit._createRedisClient();
      
      client.should.eql(redisClient);
      client.auth.called.should.be.ok;
    });
  });
});
