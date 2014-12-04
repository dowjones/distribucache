var Cache = require('./_all').Cache,
  stub = require('sinon').stub,
  spy = require('sinon').spy;

describe('Cache', function () {
  var unit, redisClient;

  beforeEach(function () {
    function noop() {}
    redisClient = stub({
      hget: noop,
      hset: noop,
      del: noop
    });
    unit = new Cache(redisClient);
  });

  it('should create a cache without config', function () {
    new Cache(redisClient, {namespace: 'n'});
    (function () {
      new Cache(redisClient, {unknownConfig: 'a'});
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

    it('should get unmarshalled data', function (done) {
      function check(err, value) {
        value.should.eql({a: 42, b: true});
        done();
      }
      redisClient.hget.yields(null, '{"a":42,"b":true}');
      unit.get('k', check);
    });

    it('should return marshalling errors in cb', function (done) {
      function check(err) {
        err.name.should.equal('MarshallingError');
        err.message.should.match(/Failed to marshall/);
        err.message.should.match(/{"a":/); // part of value
        done();
      }
      redisClient.hget.yields(null, '{"a":42,');
      unit.get('k', check);
    });

    it('should proxy error from hget', function (done) {
      function check(err) {
        err.message.should.equal('handled');
        done();
      }
      redisClient.hget.yields(new Error('handled'));
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

    it('should marshall an object to a string before setting', function (done) {
      function check(err) {
        redisClient.hset.lastCall.args[2]
          .should.equal('{"a":42,"b":true}');
        done();
      }
      redisClient.hset.yields(null, 'ok');
      unit.set('k', {a: 42, b: true}, check);
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
});
