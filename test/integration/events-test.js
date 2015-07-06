var sinon = require('sinon'),
  stub = sinon.stub,
  should = require('should'),
  w = require('../helpers/wrap'),
  dcache = require('../../'),
  slice = Array.prototype.slice,
  EVENT_NAMES = [
    'get', 'set', 'del', 'stale', 'expire', 'hit', 'miss',
    'setIdentical', 'populateIn', 'populateInError',
    'populateInMaxAttempts', 'populateInPause'
  ];

describe('integration/events', function () {
  var cache, client, store, events;

  beforeEach(function () {
    function noop() {}

    store = stub({
      createLease: noop,
      createTimer: noop,
      on: noop,
      del: noop,
      expire: noop,
      getProp: noop,
      setProp: noop,
      depProp: noop,
      incrPropBy: noop
    });
    client = dcache.createClient(store);
    cache = client.create('n');

    events = {};
    EVENT_NAMES.forEach(function (name) {
      cache.on(name, function () {
        if (!events[name]) events[name] = {callCount: 0, args: []};
        events[name].callCount++;
        events[name].args.push(slice.call(arguments));
      });
    });
  });

  describe('get', function () {
    it('should emit miss event if value is null and ignore extra store args', function (done) {
      store.getProp.withArgs('n:k').yields(null, null, 'e');

      function verify(value) {
        arguments.length.should.equal(1);
        should(value).not.be.ok();
        Object.keys(events).should.eql(['get', 'miss']);
        events.get.should.eql({callCount: 1, args: [['k']]});
        events.miss.should.eql({callCount: 1, args: [['k']]});
      }

      cache.get('k', w(verify, done));
    });

    it('should emit hit event if value is not null', function (done) {
      store.getProp.withArgs('n:b').yields(null, '"v"', 'e');

      function verify(value) {
        arguments.length.should.equal(1);
        should(value).be.ok();
        Object.keys(events).should.eql(['get', 'hit']);
        events.get.should.eql({callCount: 1, args: [['b']]});
        events.hit.should.eql({callCount: 1, args: [['b']]});
      }

      cache.get('b', w(verify, done));
    });
  });

  describe('set', function () {
    it('should emit set event and ignore extra store args', function (done) {
      store.getProp.withArgs('n:k', 'hash').yields(null, 'h', 'e');
      store.setProp.withArgs('n:k', 'value').yields(null, 'e');

      function verify() {
        arguments.length.should.equal(0);
        Object.keys(events).should.eql(['set']);
        events.set.should.eql({callCount: 1, args: [['k', '"v"']]});
      }

      cache.set('k', 'v', w(verify, done));
    });

    it('should emit set and setIdentical if hash is the same', function (done) {
      store.getProp.withArgs('n:s', 'hash').yields(null, '59b943d2fe6aede1820f470ac1e94e1a');
      store.setProp.withArgs('n:s', 'value').yields(null);

      function verify() {
        arguments.length.should.equal(0);
        Object.keys(events).should.eql(['set', 'setIdentical']);
        events.set.should.eql({callCount: 1, args: [['s']]});
        events.setIdentical.should.eql({callCount: 1, args: [['s']]});
      }

      cache.set('s', 'v', w(verify, done));
    });
  });
});

