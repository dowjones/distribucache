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
    it('should subscribe to message', function () {
      unit.listen();
      client.psubscribe.calledOnce.should.be.ok;
      client.on.calledOnce.should.be.ok;
    });

    it('should call _onExpiry on expiry event', function (done) {
      unit.listen();
      unit.on('expired', function (key) {
        key.should.equal('a');
        done();
      });
      client.on.lastCall.args[1]('__keyspace@0__:k', 'a:b', 'expired');
    });

    it('should not emit an expired event if message not "expired"', function () {
      unit.listen();
      unit.on('expired', function (key) { throw new Error('called expired'); });
      client.on.lastCall.args[1]('__keyspace@0__:k', 'a:b', 'del');
    });

    it('should not emit an expired event if wrong channel', function () {
      unit.listen();
      unit.on('expired', function (key) { throw new Error('called expired'); });
      client.on.lastCall.args[1]('__keyspace@0__:z', '', '');
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
