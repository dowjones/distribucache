var sinon = require('sinon'),
  stub = sinon.stub,
  should = require('should'),
  w = require('../helpers/wrap'),
  dcache = require('../../'),
  slice = Array.prototype.slice,
  EVENT_NAMES = [
    // GET
    'get:before', 'get:stale', 'get:expire',
    'get:hit', 'get:miss', 'get:after', 'get:error',

    // SET
    'set:before', 'set:identical', 'set:after', 'set:error',

    // DEL
    'del:before', 'del:after', 'del:error',

    // POPULATE
    'populate:before', 'populate:after', 'populate:error',

    // POPULATE_IN
    'populateIn:before', 'populateIn:pause', 'populateIn:maxAttempts',
    'populateIn:after', 'populateIn:error'
  ];

describe('integration/events', function () {
  var cache, client, store, events, clock, timer, lease;

  beforeEach(function () {
    function noop() {}
    store = stub({
      createLease: noop,
      createTimer: noop,
      on: noop,
      del: noop,
      expire: noop,
      delProp: noop,
      getProp: noop,
      setProp: noop,
      depProp: noop,
      incrPropBy: noop
    });
    timer = stub({on: noop, setTimeout: noop});
    lease = stub();
    lease.yields(null, stub());
    store.createTimer.returns(timer);
    store.createLease.returns(lease);
    clock = sinon.useFakeTimers();
    client = dcache.createClient(store);
  });

  afterEach(function () {
    clock.restore();
  });

  function createCache() {
    cache = client.create.apply(client, arguments);
    events = {};
    EVENT_NAMES.forEach(function (name) {
      cache.on(name, function () {
        if (!events[name]) events[name] = {callCount: 0, args: []};
        events[name].callCount++;
        events[name].args.push(slice.call(arguments));
      });
    });
  }

  describe('get', function () {
    beforeEach(createCache.bind(null, 'n'));

    it('should emit `miss` if value is null', function (done) {
      store.getProp.withArgs('n:k').yields(null, null, 'e');

      function verify(value) {
        arguments.length.should.equal(1);
        should(value).not.be.ok();
        Object.keys(events).should.eql([
          'get:before', 'get:after', 'get:miss'
        ]);
        events.should.eql({
          'get:before': {callCount: 1, args: [['k']]},
          'get:after': {callCount: 1, args: [['k', 0]]},
          'get:miss': {callCount: 1, args: [['k']]}
        });
      }

      cache.get('k', w(verify, done));
    });

    it('should emit hit event if value is not null', function (done) {
      store.getProp.withArgs('n:b').yields(null, '"v"', 'e');

      function verify(value) {
        arguments.length.should.equal(1);
        should(value).be.ok();
        Object.keys(events).should.eql([
          'get:before', 'get:after', 'get:hit'
        ]);
        events['get:hit'].should.eql({callCount: 1, args: [['b']]});
      }

      cache.get('b', w(verify, done));
    });

    describe('with `staleIn` set', function () {
      beforeEach(createCache.bind(null, 'n', {staleIn: 100}));

      it('should emit a `miss` event when cache empty', function (done) {
        store.getProp.withArgs('n:b', 'createdAt').yields(null, null);

        function verify(value) {
          arguments.length.should.equal(1);
          should(value).not.be.ok();
          Object.keys(events).should.eql([
            'get:before', 'get:after', 'get:miss'
          ]);
          events['get:miss'].should.eql({callCount: 1, args: [['b']]});
        }

        cache.get('b', w(verify, done));
      });

      it('should not emit a `stale` event when cache not stale', function (done) {
        store.getProp.withArgs('n:b', 'createdAt').yields(null, Date.now());
        store.getProp.withArgs('n:b', 'value').yields(null, '"v"');

        function verify(value) {
          arguments.length.should.equal(1);
          value.should.equal('v');
          Object.keys(events).should.eql([
            'get:before', 'get:after', 'get:hit'
          ]);
        }

        cache.get('b', w(verify, done));
      });

      it('should emit a `stale` event when cache empty and get', function (done) {
        store.getProp.withArgs('n:b', 'createdAt').yields(null, Date.now() - 200);
        store.getProp.withArgs('n:b', 'value').yields(null, '"v"');

        function verify(value) {
          arguments.length.should.equal(1);
          value.should.equal('v');
          Object.keys(events).should.eql([
            'get:before', 'get:stale', 'get:after', 'get:hit'
          ]);
          events['get:stale'].should.eql({callCount: 1, args: [['b']]});
        }

        cache.get('b', w(verify, done));
      });
    });

    describe('with `expireIn` set', function () {
      it('should emit an `get:expire` event and delete the cache when cache expires', function (done) {
        createCache('n', {expiresIn: 100});

        store.getProp.withArgs('n:c', 'createdAt').yields(null, Date.now() - 200);
        store.del.withArgs('n:c').yields(null);

        function verify(value) {
          arguments.length.should.equal(1);
          should(value).not.be.ok();
          //Object.keys(events).should.eql(['expire', 'del', 'miss']);
          Object.keys(events).should.eql([
            'get:before', 'get:expire',
            'del:before', 'del:after',
            'get:after', 'get:miss'
          ]);
          events['get:expire'].should.eql({callCount: 1, args: [['c']]});
          events['del:before'].should.eql({callCount: 1, args: [['c']]});
          events['del:after'].should.eql({callCount: 1, args: [['c', 0]]});
        }

        cache.get('c', w(verify, done));
      });
    });
  });

  describe('set', function () {
    beforeEach(createCache.bind(null, 'n'));

    it('should emit set events and ignore extra store args', function (done) {
      store.getProp.withArgs('n:k', 'hash').yields(null, 'h', 'e');
      store.setProp.withArgs('n:k', 'value').yields(null, 'e');

      function verify() {
        arguments.length.should.equal(0);
        Object.keys(events).should.eql(['set:before', 'set:after']);
        events['set:before'].should.eql({callCount: 1, args: [['k', 'v']]});
        events['set:after'].should.eql({callCount: 1, args: [['k', 'v', 0]]});
      }

      cache.set('k', 'v', w(verify, done));
    });

    it('should emit set and set:identical if hash is the same', function (done) {
      store.getProp.withArgs('n:s', 'hash').yields(null, '59b943d2fe6aede1820f470ac1e94e1a');
      store.setProp.withArgs('n:s', 'value').yields(null);

      function verify() {
        arguments.length.should.equal(0);
        Object.keys(events).should.eql(['set:before', 'set:identical', 'set:after']);
        events['set:identical'].should.eql({callCount: 1, args: [['s']]});
      }

      cache.set('s', 'v', w(verify, done));
    });
  });

  describe('populate', function () {
    it('should populate on a `get:miss`', function (done) {
      createCache('n', {
        populate: function (k, cb) {
          cb(null, 'z');
        }
      });

      function verify(value) {
        value.should.eql('z');
        Object.keys(events).should.eql([
          'get:before', 'get:after', 'get:miss',
          'populate:before',
          'set:before', 'set:after',
          'populate:after'
        ]);
        events['populate:before'].should.eql({callCount: 1, args: [['k']]});
        events['populate:after'].should.eql({callCount: 1, args: [['k', 0]]});
      }

      store.getProp.withArgs('n:k').yields(null, null);
      store.setProp.withArgs('n:k').yields(null);

      cache.get('k', w(verify, done));
    });

    it('should emit a `:error` event on an error', function (done) {
      createCache('n', {
        populate: function (k, cb) {
          cb(new Error('perr'));
        }
      });

      function verify(err) {
        err.name.should.equal('PopulateError');
        Object.keys(events).should.eql([
          'get:before', 'get:after', 'get:miss',
          'populate:before', 'populate:error', 'populate:after'
        ]);
        events['populate:error'].callCount.should.equal(1);
        events['populate:error'].args[0][0].should.be.instanceOf(Error);
        done();
      }

      store.getProp.withArgs('n:k').yields(null, null);

      cache.get('k', verify);
    });
  });

  describe('populateIn', function () {
    beforeEach(function () {
      createCache('n', {
        populateIn: 700,
        pausePopulateIn: 900,
        populateInAttempts: 0,
        populate: function (k, cb) {
          cb(null, 'z');
        }
      });
    });

    it('should emit events in correct sequence when triggered', function (done) {
      store.getProp.withArgs('n:k', 'accessedAt').yields(null, 0);
      store.getProp.withArgs('n:k', 'hash').yields(null, null);
      store.setProp.withArgs('n:k', 'value').yields(null);
      store.delProp.withArgs('n:k', 'populateInErrorCount').yields(null);

      timer.on.secondCall.args[0].should.equal('timeout');
      timer.on.secondCall.args[1]('k');

      cache.on('populateIn:after', function () {
        Object.keys(events).should.eql([
          'populateIn:before',
          'populate:before',
          'set:before', 'set:after',
          'populate:after',
          'populateIn:after'
        ]);

        events['populateIn:before'].should.eql({callCount: 1, args: [['k']]});
        events['populateIn:after'].should.eql({callCount: 1, args: [['k', 0]]});

        done();
      });
    });

    it('should emit a `:pause` when the cache hasn\'t been accessed', function (done) {
      clock.tick(1000);
      store.getProp.withArgs('n:k', 'accessedAt').yields(null, 1);

      timer.on.secondCall.args[0].should.equal('timeout');
      timer.on.secondCall.args[1]('k');

      cache.on('populateIn:after', function () {
        Object.keys(events).should.eql([
          'populateIn:before',
          'populateIn:pause',
          'populateIn:after'
        ]);

        events['populateIn:pause'].should.eql({callCount: 1, args: [['k']]});

        done();
      });
    });

    it('should emit a `:maxAttempts` when cache reaches `populateInAttempts`', function (done) {
      // for the PopulateError we're triggering
      client.on('error', function () {});

      lease.yields(new Error('uncool'));
      store.getProp.withArgs('n:k', 'accessedAt').yields(null, 0);
      store.incrPropBy.withArgs('n:k', 'populateInErrorCount').yields(null, 1);

      cache.on('populateIn:after', function () {
        Object.keys(events).should.eql([
          'populateIn:before',
          'populateIn:maxAttempts',
          'populateIn:error',
          'populateIn:after'
        ]);

        events['populateIn:maxAttempts'].should.eql({callCount: 1, args: [['k']]});

        done();
      });

      timer.on.secondCall.args[0].should.equal('timeout');
      timer.on.secondCall.args[1]('k');
    });
  });
});
