var MarshallDecorator = require('../_all')
    .decorators.MarshallDecorator,
  stub = require('sinon').stub;

describe('decorators/MarshallDecorator', function () {
  var unit, cache;

  beforeEach(function () {
    function noop() {}
    cache = stub({get: noop, set: noop});
    unit = new MarshallDecorator(cache);
  });

  describe('get', function () {
    it('should get unmarshalled data', function (done) {
      function check(err, value) {
        value.should.eql({a: 42, b: true});
        done();
      }
      cache.get.yields(null, '{"a":42,"b":true}');
      unit.get('k', check);
    });

    it('should return an error if the value is not a string', function (done) {
      function check(err) {
        err.name.should.equal('MarshallingError');
        done();
      }
      cache.get.yields(null, [1, 2, 3]);
      unit.get('k', check);
    });

    it('should return marshalling errors in cb', function (done) {
      function check(err) {
        err.name.should.equal('MarshallingError');
        err.message.should.match(/Failed to marshall/);
        err.message.should.match(/{"a":/); // part of value
        done();
      }
      cache.get.yields(null, '{"a":42,');
      unit.get('k', check);
    });

    it('should proxy other errors', function (done) {
      function check(err) {
        err.message.should.equal('bad');
        done();
      }
      cache.get.yields(new Error('bad'));
      unit.get('k', check);
    });
  });

  describe('set', function () {
    it('should marshall an object to a string before setting', function (done) {
      function check(err) {
        cache.set.lastCall.args[1]
          .should.equal('{"a":42,"b":true}');
        done();
      }
      cache.set.yields(null, '');
      unit.set('k', {a: 42, b: true}, check);
    });

    it('should marshall `undefined` as `null`', function (done) {
      function check(err) {
        cache.set.lastCall.args[1].should.equal('null');
        done();
      }
      cache.set.yields(null, '');
      unit.set('k', undefined, check);
    });
  });
});
