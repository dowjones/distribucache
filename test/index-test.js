var proxyquire = require('proxyquire').noCallThru(),
  spy = require('sinon').spy;

describe('Distribucache', function () {
  var noop, unit, deco, c;

  beforeEach(function () {
    deco = {};
    unit = proxyquire('../lib', {
      './Cache': function () {},
      'require-directory': function () {
        return deco;
      }
    });
  });

  describe('create', function () {
    it('should create default cache', function () {
      deco.OnlySetChangedDecorator = spy();
      c = unit.create();
      c.should.be.type('object');
      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
    });

    it('should create a small-value optimized cache', function () {
      c = unit.create({optimizeForSmallValues: true});
      c.should.be.type('object');
    });

    it('should use the expire deco on expiresIn', function () {
      deco.OnlySetChangedDecorator = spy();
      deco.ExpireDecorator = spy();

      c = unit.create({expiresIn: 200});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.ExpireDecorator.calledOnce.should.be.ok;
    });

    it('should use the expire deco on staleIn', function () {
      deco.OnlySetChangedDecorator = spy();
      deco.ExpireDecorator = spy();

      c = unit.create({staleIn: 200});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.ExpireDecorator.calledOnce.should.be.ok;
    });

    it('should use the populate deco on populate', function () {
      deco.OnlySetChangedDecorator = spy();
      deco.PopulateDecorator = spy();

      c = unit.create({populate: function () {}});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.PopulateDecorator.calledOnce.should.be.ok;
    });

    it('should use the populateIn deco on populateIn & populate', function () {
      deco.OnlySetChangedDecorator = spy();
      deco.PopulateDecorator = spy();
      deco.PopulateInDecorator = spy();

      c = unit.create({populateIn: 200, populate: function () {}});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.PopulateDecorator.calledOnce.should.be.ok;
      deco.PopulateInDecorator.calledOnce.should.be.ok;
    });

    it('should not use populateIn without populate', function () {
      deco.OnlySetChangedDecorator = spy();
      deco.PopulateInDecorator = spy();

      c = unit.create({populateIn: 200});
      c.should.be.type('object');

      deco.OnlySetChangedDecorator.calledOnce.should.be.ok;
      deco.PopulateInDecorator.calledOnce.should.not.be.ok;
    });
  });
});
