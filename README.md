# Distribucache [![Build Status](https://secure.travis-ci.org/areusjs/distribucache.png)](http://travis-ci.org/areusjs/distribucache) [![NPM version](https://badge.fury.io/js/distribucache.svg)](http://badge.fury.io/js/distribucache)

Redis-backed automatically-repopulating cache. This cache does everything in
its power to shield the caller from the delays of the downstream services. It has a unique
feature, where the cache will populate itself on a certain interval, and will
gracefully stop doing so when the values that were being refreshed have not been used.

The cache can be used in various ways, ranging from the simplest get / set, to
complex scenarious with watermarks for staleness and final expiration.


## Usage

### Basic

There are many different ways to use the cache. Features are added to the cache,
based on the configuration that you use. Below is an example of the simplest cache:

```javascript
var dc = require('distribucache'),
  // create a cache-client (keeps track of the Redis connections)
  // generally performed once in the lifetime of the app
  cacheClient = dc.createClient({
    host: 'localhost',
    port: 6379
  }),
  // create a new cache
  // performed every time a new cache configuration is needed
  cache = cacheClient.create('nsp');

cache.get('k1', function (err, value) {
  if (err) throw err;
  console.log('got value:', value);
});

cache.set('k1', 'v1' function (err, value) {
  if (err) throw err;
  console.log('set value:', value);
});

cache.del('k1', function (err) {
  if (err) throw err;
  console.log('deleted k1');
});
```

*Note:* the `value` from the `get` will be `null` if
the value is not in the cache.


### Configuration

The cache can be configured in two places: (a) when creating a cache-client,
and (b) when creating a cache. As you expect, the configuration in the
cache overrides the configuration of the cache-client:

```javascript
var cacheClient = dc.createClient({
  host: 'localhost',
  port: 6379,
  expiresIn: '2 sec'   // setting globally
});

// overrides the globally set `expiresIn`
var articleCache = cacheClient.create('articles', {
  expiresIn: '1 min'
});

// uses the global `expiresIn`
var pageCache = cacheClient.create('pages');
```


### Populating

A common pattern is to call the `get` first, and if the item is not
in the cache, call `set`. For this common pattern, you can provide
a `populate` function when creating the cache. On a `get`, if the
cache is empty your `populate` function will be called to populate the
cache, and then the flow will continue to the `get` callback. This ensures
that the `get` always returns a value, either from the cache or from
the downstream service.

```javascript
var cache = cacheClient.create('nsp', {
  populate: function (key, cb) {
    setTimeout(function () {
      cb(null, 42);
    }, 100);
  }
});

cache.get('k1', function (err, value) {
  console.log(value); // 42
});
```


### Expiration / Staleness

An `expiresIn` can be set (in ms or in human-reabable format described below)
to for the cache to use return `null`
and to drop a value from the datastore when it reaches
its expiration date. When the `populate` function is set,
instead of returning `null` the `populate` method will be called.

```javascript
var cache = cacheClient.create('nsp', {
  expiresIn: 2000  // 2 seconds
});
```

A `staleIn` can also be set. It acts as a low-water-mark. When a value
is stale it is still returned as is to the caller. Two additional things happen:
(a) the `stale` event is called (with `key` as the argument) and (b) the `populate`
is called in the background if it is provided; allowing the next `get` call to
get a fresh value, without incurring the delay of accessing a downstream service.

```javascript
var cache = cacheClient.create('nsp', {
  staleIn: 1000  // 1 second
});
```


### Timer-based Background Population

The trickiest, yet most powerful feature of the cache is its ability
to update its keys on a specific interval. To do this set the `populateIn`
config. You must also set a `pausePopulateIn` to make sure the cache
is not re-populated forever needlessly.

The cache will use the `pausePopulateIn` to check whether the key has
been used during that interval. The cache does this by tracking the
access time of keys. For example, if you want the cache to stop populating when the
key hasn't been used for a minute, set `pausePopulateIn` to `1000 * 60` ms.

```javascript
var cache = cacheClient.create('nsp', {
  populateIn: 1000  // 1 second
  pausePopulateIn: 1000 * 60  // 1 minute
});
```

*Note:* this feature will work even with disruptions to the service, as the burder
of determining which keys need to be re-populated is on Redis (using a combination
of keyspace events and expiring keys).


### Stored Value Size Optimization

The default assumption for this cache is that the values stored will be large.
Thus, unnecessarily storing a value identical to the one that is already in
the cache should be avoided, even at some cost.

When a value is set into the cache, an md5 hash of the value is stored along
with it. On subsequent `set` calls, first the hash is retrieved from the cache,
and if it is identical to the hash of the new value, the new value is not
sent to the cache. Thus, for the price of an additional call to the
datastore and a few extra CPU cycles for the md5 checksum the cache makes
sure that the large value does not get (un)marshalled and transmitted to
the datastore.

If the values that you intend to store are small (say, < 0.1 KB; the hash itself is 16 bytes),
it may not make sense to have the extra call. Thus, you may want to disable
this feature in that case. To do so, set the `optimizeForSmallValues`
config parameter to `true`:

```javascript
var cache = cacheClient.create('nsp', {
  optimizeForSmallValues: true
});
```


### API

#### Distribucache

  - `createClient(config)`

Possible `config` values:
```
{String} [config.host] defaults to 'localhost'
{Number} [config.port] defaults to 6379
{String} [config.password]
```

The following values are allowed for the config and are
also available to the `CacheClient#create`:
```
{String} [config.namespace]
{Boolean} [config.optimizeForSmallValues] defaults to false
{Boolean} [config.stopEventPropagation] defaults to false
{String} [config.expiresIn] in ms
{String} [config.staleIn] in ms
{Function} [config.populate]
{Number} [config.populateIn] in ms, defaults to 30sec
{Number} [config.pausePopulateIn] in ms
{Number} [config.leaseExpiresIn] in ms
{Number} [config.accessedAtThrottle] in ms
```

#### CacheClient

  - `create(namespace, config)`
    - `namespace` is a `String` that will identify the particular cache.
      It is good practice to add a version to the namespace in order to
      make sure that when you change the interface, you will not get
      older cached objects (with a possibly different signature).
      For example: `create('articles:v1')`.
    - `config` is an `Object`. See the global config above for all
      of the possible values.


### CacheClient-emitted Events

The `CacheClient` events are propagated from the `Cache`s created by the client.
You can disable event-propagation by setting `config.stopEventPropagation` to `true`.

The following events are emmitted *before* the actual call is completed:

  - `get` - `(key, namespace)`
  - `set` - `(key, value, namespace)`
  - `del` -  `(key, namespace)`
  - `stale` - `(key, namespace)`
  - `error` - `(error, namespace)`

`error` is emitted by various feature decorators. It is a good idea to listen
to this event, as otherwise the built-in `EventEmitter` will **throw**
the error.


### Cache-emitted Events

The following events are emmitted *before* the actual call is completed:

  - `get` - `(key)`
  - `set` - `(key, value)`
  - `del` -  `(key)`
  - `stale` - `(key)` - emitted on a get, when the value is in the cache but is stale. This happens only when the `staleIn` is set.


### Human-readable Time Intervals

The time intervals in this library can be provided as a `number`
in milliseconds **or** as a human-readible time interval.

Below are a few  examples:

  - `1 ms`
  - `5 days`
  - `3 minutes`
  - `10 hours`
  - `30 seconds`

There are also a few supported abbreviations (either can be used):

   - `ms`
   - `sec` -> `second`
   - `min` -> `minute`


## License

[MIT](/LICENSE)
