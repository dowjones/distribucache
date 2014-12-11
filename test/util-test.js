var proxyquire = require('proxyquire').noCallThru(),
  stub = require('sinon').stub;

describe('util', function () {
  var noop, util, redis;

  beforeEach(function () {
    noop = function () {};
    redis = {createClient: stub()};
    redis.createClient.returns({auth: stub()});
    util = proxyquire('../lib/util', {
      redis: redis
    });
  });

  describe('createHash', function () {
    it('should create the same hash for the same value', function () {
      util.createHash('a').should.eql(util.createHash('a'));
    });

    it('should create a different hash for different values', function () {
      util.createHash('a').should.not.eql(util.createHash('b'));
    });
  });

  describe('completeWithin', function () {
    it('should yield an TimeoutError if cb takes longer than timeout', function (done) {
      function longTime(cb) {
        setTimeout(function () {
          cb(null);
        }, 3);
      }

      function onReady(err) {
        err.name.should.equal('TimeoutError');
        done();
      }

      longTime(util.completeWithin(1, onReady));
    });

    it('should call the `done` before timeout', function (done) {
      function longTime(cb) {
        setTimeout(function () {
          cb(null);
        }, 3);
      }
      longTime(util.completeWithin(6, done));
    });
  });

  describe('intervalToMs', function () {
    it('should return the input if not a string', function () {
      util.intervalToMs(100).should.equal(100);
    });

    it('should return the input if the input does not match the re', function () {
      util.intervalToMs('hello').should.equal('hello');
    });

    it('should parse and transform various formats', function () {
      var tests = ['1ms', '10 ms', '3 sec', '3 seconds',
        '1min', '1 minute', '1 hour', '1 day', '1 week',
        '1 month', '10 years'];
      tests.forEach(function (test) {
        util.intervalToMs(test).should.be.type('number');
      });
    });

    it('should understand floats', function () {
      util.intervalToMs('1.5 seconds').should.equal(1500);
    });
  });

  describe('getNamespace', function () {
    it('should return an empty string if no input', function () {
      util.createNamespace().should.equal('');
    });

    it('should return the only arg if one arg', function () {
      util.createNamespace('a').should.equal('a');
    });

    it('should return a namespace provided multiple args', function () {
      util.createNamespace('a', 'b', 'c').should.equal('a:b:c');
    });

    it('should skip falsey args', function () {
      util.createNamespace('a', undefined, false, null, '', 'b').should.equal('a:b');
    });
  });

  describe('ensureKeyspaceNotifications', function () {
    var client;

    beforeEach(function () {
      client = {config: stub()};
    });

    it('should emit an error on err', function (done) {
      function check(err) {
        err.message.should.equal('bad');
        done();
      }
      client.config.yields(new Error('bad'));
      util.ensureKeyspaceNotifications(client, check);
    });

    it('should warn if the config command is restricted', function (done) {
      function check(err, response) {
        if (err) return done(err);
        response.should.equal('NOT CONFIGURED');
        done();
      }
      client.config.yields(new Error('unknown command \'config\''));
      util.ensureKeyspaceNotifications(client, check);
    });

    it('should set keyspace and expired notifications and emit expired', function (done) {
      function check(err, response) {
        if (err) return done(err);
        response.should.equal('ok');
        done();
      }
      client.config.withArgs('get', 'notify-keyspace-events').yields(null, ['', '']);
      client.config.withArgs('set', 'notify-keyspace-events', 'Kx').yields(null, 'ok');
      util.ensureKeyspaceNotifications(client, check);
    });

    it('should only set expired notifications if keyspace are set', function (done) {
      function check(err, response) {
        if (err) return done(err);
        response.should.equal('ok');
        done();
      }
      client.config.withArgs('get', 'notify-keyspace-events').yields(null, ['', 'K']);
      client.config.withArgs('set', 'notify-keyspace-events', 'Kx').yields(null, 'ok');
      util.ensureKeyspaceNotifications(client, check);
    });

    it('should only set keyspace notifications if expired are set', function (done) {
      function check(err, response) {
        if (err) return done(err);
        response.should.equal('ok');
        done();
      }
      client.config.withArgs('get', 'notify-keyspace-events').yields(null, ['', 'x']);
      client.config.withArgs('set', 'notify-keyspace-events', 'xK').yields(null, 'ok');
      util.ensureKeyspaceNotifications(client, check);
    });

    it('should not set notifications if already set', function (done) {
      function check(err, response) {
        if (err) return done(err);
        response.should.equal('CONFIGURED');
        done();
      }
      client.config.withArgs('get', 'notify-keyspace-events').yields(null, ['', 'Kx']);
      util.ensureKeyspaceNotifications(client, check);
    });
  });

  describe('createRedisClient', function () {
    it('should create a brand new redis client', function () {
      util.createRedisClient().should.be.type('object');
    });

    it('should create an authenticated redis client', function () {
      util.createRedisClient({password: 'p'}).should.be.type('object');
    });
  });

  describe('logError', function () {
    it('should log the error if exist', function (done) {
      var logger = {
        error: function (err) {
          err.should.equal('e');
          done();
        }
      };
      util.logError(logger)('e');
    });

    it('should do nothing if no error', function () {
      util.logError()(null);
    });
  });

  describe('propagateEvents', function () {
    it('should pass the sourceName as the last param', function () {
      var source = stub({on: noop}), dest = stub({emit: noop});
      source.on.yields('ooo');
      util.propagateEvents(source, dest, ['nom'], 'sn');
      dest.emit.firstCall.args.should.eql(['nom', 'ooo', 'sn']);
    });
  });
});
