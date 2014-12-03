var proxyquire = require('proxyquire').noCallThru();

describe('Distribucache', function () {
  var distribucache;

  beforeEach(function () {
    distribucache = proxyquire('../lib', {
      './CacheClient': function () {
        this.answer = 42;
      }
    });
  });

  describe('createClient', function () {
    it('should create a new cache client', function () {
      distribucache.createClient().answer.should.equal(42);
    });
  });
});
