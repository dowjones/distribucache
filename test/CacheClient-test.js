var proxyquire = require('proxyquire').noCallThru(),
  stub = require('sinon').stub,
  spy = require('sinon').spy;

describe('CacheClient', function () {
  var noop, CacheClient, redisClient, unit, deco, c;

  beforeEach(function () {
    var redis;
    function noop() {}

    deco = {};
    redis = stub({createClient: noop}),
    redisClient = stub({auth: noop});
    redis.createClient.returns(redisClient);

    CacheClient = proxyquire('../lib/CacheClient', {
      './Cache': function () {},
      'redis': redis,
      'require-directory': function () {
        return deco;
      }
    });

    deco.OnlySetChangedDecorator = spy();
    deco.MarshallDecorator = spy();
    unit = new CacheClient();
  });

  it('should create a client with auth', function () {
    unit = new CacheClient({password: 'abc'});
    redisClient.auth.calledTwice.should.be.ok;
  });

  describe('create', function () {
    it('should create default cache', function () {
      c = unit.create('n');
      c.should.be.type('object');
      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
    });

    it('should create a small-value optimized cache', function () {
      c = unit.create('n', {optimizeForSmallValues: true});
      c.should.be.type('object');
    });

    it('should use the expire deco on expiresIn', function () {
      deco.ExpireDecorator = spy();

      c = unit.create('n', {expiresIn: 200});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.ExpireDecorator.calledOnce.should.be.ok;
    });

    it('should use the expire deco on staleIn', function () {
      deco.ExpireDecorator = spy();

      c = unit.create('n', {staleIn: 200});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.ExpireDecorator.calledOnce.should.be.ok;
    });

    it('should use the populate deco on populate', function () {
      deco.PopulateDecorator = spy();

      c = unit.create('n', {populate: function () {}});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.PopulateDecorator.calledOnce.should.be.ok;
    });

    it('should use the populateIn deco on populateIn & populate', function () {
      deco.PopulateDecorator = spy();
      deco.PopulateInDecorator = spy();

      c = unit.create('n', {populateIn: 200, populate: function () {}});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.PopulateDecorator.calledOnce.should.be.ok;
      deco.PopulateInDecorator.calledOnce.should.be.ok;
    });

    it('should not use populateIn without populate', function () {
      deco.PopulateInDecorator = spy();

      c = unit.create('n', {populateIn: 200});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.PopulateInDecorator.calledOnce.should.not.be.ok;
    });
  });
});
