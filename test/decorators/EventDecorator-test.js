var all = require('../_all'),
  EventDecorator = all.decorators.EventDecorator,
  stub = require('sinon').stub;

describe('decorators/EventDecorator', function () {
  var unit, cache;

  beforeEach(function () {
    function noop() {}
    cache = stub({
      emit: noop,
      get: noop,
      set: noop,
      del: noop
    });
    unit = new EventDecorator(cache);
  });

  describe('get', function () {
    it('should emit a get:hit event', function (done) {
      function check() {
        cache.emit.thirdCall.args[0].should.equal('get:hit');
        done();
      }

      cache.get.yields(null, 'v');
      unit.get('k', check);
    });

    it('should emit a get:hit event on null value', function (done) {
      function check() {
        cache.emit.thirdCall.args[0].should.equal('get:miss');
        done();
      }

      cache.get.yields(null, null);
      unit.get('k', check);
    });

    it('should proxy error from hget', function (done) {
      function check(err) {
        err.message.should.equal('handled');
        done();
      }
      cache.get.yields(new Error('handled'));
      unit.get('k', check);
    });
  });

  it('should set', function(done) {
    cache.set.withArgs('k', 'v').yields(null);
    unit.set('k', 'v', done);
  });

  it('should del', function(done) {
    cache.del.withArgs('k').yields(null);
    unit.del('k', done);
  });
});
