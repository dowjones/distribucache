# Distribucache [![Build Status](https://secure.travis-ci.org/dowjones/distribucache.png)](http://travis-ci.org/dowjones/distribucache) [![NPM version](https://badge.fury.io/js/distribucache.svg)](http://badge.fury.io/js/distribucache)

Datastore-independent automatically-repopulating cache. This cache does everything in
its power to shield the caller from the delays of the downstream services. It has a unique
feature, where the cache will populate itself on a certain interval, and will
stop doing so when the values that were being refreshed have not been used.

There are multiple available **datastores**, including:
  - [Redis](https://github.com/dowjones/distribucache-redis-store)
  - [Memory](https://github.com/dowjones/distribucache-memory-store)

The cache can be used in various ways, ranging from the simplest get / set, to
complex scenarios with watermarks for staleness and final expiration.


## Usage

### Basic

There are many different ways to use the cache. Features are added to the cache,
based on the configuration that you use. Below is an example of the simplest cache:

```javascript
var distribucache = require('distribucache'),
  // create a Redis store (to keep track of the Redis connections)
  // generally performed once in the lifetime of the app
  redisStore = require('distribucache-redis-store'),
  cacheClient = distribucache.createClient(redisStore({
    host: 'localhost',
    port: 6379
  })),
  // create a new cache
  // performed every time a new cache configuration is needed
  cache = cacheClient.create('nsp');

cache.get('k1', function (err, value) {
  if (err) throw err;
  console.log('got value:', value);
});

cache.set('k1', 'v1', function (err) {
  if (err) throw err;
  console.log('set value');
});

cache.del('k1', function (err) {
  if (err) throw err;
  console.log('deleted k1');
});
```

**Promises:** if a callback is not provided as the last argument, a
[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
will be returned from the `get`, `set` and `del` methods.

**Note:** the `value` from the `get` will be `null` if
the value is not in the cache.

### Configuration

The cache can be configured in two places: (a) when creating a cache-client,
and (b) when creating a cache. As you expect, the configuration in the
cache overrides the configuration of the cache-client:

```javascript
var cacheClient = distribucache.createClient(store, {
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

**Promises:** the `populate` function may return a
[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
if you choose.


### Expiration / Staleness

When an `expiresIn` is set, a get request will return `null`
after the time expires. After this, the value will be dropped
from the datastore. When the `populate` function is set,
instead of returning `null` the `populate` method will be called.

The `expiresIn` may be set in milliseconds or in the
[human-readable](/docs/timeIntervals.md) format.

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

The more complex, yet most powerful feature of the cache is its ability
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

*Note:* this feature will work even with disruptions to the service, as the burden
of determining which keys need to be re-populated is on the store (e.g., in the Redis store this
is done using a combination of keyspace events and expiring keys).


### API

#### Distribucache

  - `createClient(store, config)`

Possible `config` values below.
```
{String} [config.namespace]
{Boolean} [config.optimizeForSmallValues] defaults to false
{Boolean} [config.optimizeForBuffers] defaults to false
{String} [config.expiresIn] in ms
{String} [config.staleIn] in ms
{Function} [config.populate]
{Number} [config.populateIn] in ms, defaults to 30sec
{Number} [config.populateInAttempts] defaults to 5
{Number} [config.pausePopulateIn] in ms, defaults to 30sec
{Number} [config.timeoutPopulateIn] in ms
{Number} [config.leaseExpiresIn] in ms
{Number} [config.accessedAtThrottle] in ms, defaults to 1000
```

**Notes:** 
  - The values above are allowed for the config and are
also available to the `CacheClient#create`
  - See the [Optimizations docs](/docs/optimizations.md) for values 
that begin with `optimizeFor`

#### CacheClient

  - `create(namespace, config)`
    - `namespace` is a `String` that will identify the particular cache.
      It is good practice to add a version to the namespace in order to
      make sure that when you change the interface, you will not get
      older cached objects (with a possibly different signature).
      For example: `create('articles:v1')`.
    - `config` is an `Object`. See the global config above for all
      of the possible values.

### More

 - [Events](/docs/events.md)
 - [Optimizations](/docs/optimizations.md)
 - [Human-readable Time Intervals](/docs/timeIntervals.md)
 - [Debugging](/docs/debugging.md)

## License

[MIT](/LICENSE)
