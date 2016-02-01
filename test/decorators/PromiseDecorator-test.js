var proxyquire = require('proxyquire').noCallThru(),
  stub = require('sinon').stub,
  UNIT_PATH = '../../lib/decorators/PromiseDecorator';

describe('decorators/PromiseDecorator', function () {
  var unit, BaseDeco;

  beforeEach(function () {
    BaseDeco = function () {};
    BaseDeco.prototype.get = stub();
    BaseDeco.prototype.set = stub();
    BaseDeco.prototype.del = stub();

    var Unit = proxyquire(UNIT_PATH, {
      './BaseDecorator': BaseDeco
    });

    unit = new Unit();
  });

  it('should return err on reject', function (done) {
    BaseDeco.prototype.get.withArgs('ek').yields(new Error('el'));
    unit.get('ek').catch(function (err) {
      err.message.should.eql('el');
      done();
    });
  });

  it('should return promise on get', function (done) {
    BaseDeco.prototype.get.withArgs('gk').yields(null);
    unit.get('gk').then(done);
  });

  it('should return promise on set', function (done) {
    BaseDeco.prototype.set.withArgs('sk', 'sv').yields(null);
    unit.set('sk', 'sv').then(done);
  });

  it('should return promise on del', function (done) {
    BaseDeco.prototype.del.withArgs('dk').yields(null);
    unit.del('dk').then(done);
  });
});
