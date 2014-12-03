var all = require('../_all'),
  PopulateDecorator = all.decorators.PopulateDecorator,
  stub = require('sinon').stub,
  joi = require('joi');

describe('PopulateDecorator', function () {
  var unit, cache, noop, redisClient, populate;

  beforeEach(function () {
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
    unit = new PopulateDecorator(cache, {
      populate: populate
    });
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
});
