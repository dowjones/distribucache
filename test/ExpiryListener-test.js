var stub = require('sinon').stub,
  ExpiryListener = require('./_all').ExpiryListener;

describe('ExpiryListener', function () {
  var unit, noop, client;

  beforeEach(function () {
    function noop() {}
    client = stub({
      config: noop, on: noop,
      psubscribe: noop, punsubscribe: noop
    });
    unit = new ExpiryListener(client, {keyspace: 'k'});
  });

  it('should throw an invalidate error if no keyspace provided', function () {
    (function () { new ExpiryListener(client, {}); }).should.throw(/keyspace/);
    (function () { new ExpiryListener(client); }).should.throw(/keyspace/);
  });

  describe('listen', function () {
    it('should emit an error on err', function (done) {
      unit.on('error', function (err) {
        err.message.should.equal('bad');
        done();
      });
      client.config.yields(new Error('bad'));
      unit.listen();
    });

    it('should set keyspace and expired notifications and emit expired', function (done) {
      var listen = false, expired = false;
      function check() { if (listen && expired) done(); }
      unit.on('listen', function () { listen = true; check(); });
      unit.on('expired', function () { expired = true; check(); });

      client.config.withArgs('get', 'notify-keyspace-events').yields(null, ['', '']);
      client.config.withArgs('set', 'notify-keyspace-events', 'Kx').yields(null, 'ok');

      client.on = function (message, cb) {
        cb('__keyspace@0__:k', 'a:b', 'expired');
      };

      unit.listen();
    });

    it('should set keyspace and expired notifications', function (done) {
      client.config.yields(null, ['', '']);
      client.on = function (message, cb) { cb('', 'a:b', 'del'); };
      unit.on('listen', done);
      unit.on('expired', function () { throw new Error('very bad'); });
      unit.listen();
    });

    it('should only set expired notifications if keyspace are set', function (done) {
      unit.on('listen', done);
      client.config.withArgs('get', 'notify-keyspace-events').yields(null, ['', 'K']);
      client.config.withArgs('set', 'notify-keyspace-events', 'Kx').yields(null, 'ok');
      unit.listen();
    });

    it('should only set keyspace notifications if expired are set', function (done) {
      unit.on('listen', done);
      client.config.withArgs('get', 'notify-keyspace-events').yields(null, ['', 'x']);
      client.config.withArgs('set', 'notify-keyspace-events', 'xK').yields(null, 'ok');
      unit.listen();
    });
  });

  describe('stopListening', function () {
    it('should send an unsubscribe and emit a stop', function (done) {
      unit.on('stop', done);
      client.punsubscribe.yields(null);
      unit.stopListening();
    });

    it('should emit an error on unsubscribe error', function (done) {
      unit.on('error', function (err) {
        err.message.should.equal('bad');
        done();
      });
      client.punsubscribe.yields(new Error('bad'));
      unit.stopListening();
    });
  });
});
