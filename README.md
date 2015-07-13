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

*Note:* the `value` from the `get` will be `null` if
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


### Optimization For Caching Buffers

By default the library is configured to store objects. Distribucache marshalls
the objects to a string (via `JSON.stringify`) and stores it in a datastore.
When retrieving an object from a store distribucache will unmarshall the string
(via `JSON.parse`) and return the object to the client. This works well for objects,
but is not optimal for storing `Buffer`s, as said marshalling has memory and CPU overhead.
To minimize that overhead distribucache has an `optimizeForBuffers` configuration option.

With the `distribucache-redis-store` for example, the full path an object takes may be:
`Buffer (Redis) -> String (Redis) -> Object (Distribucache) -> String (App) -> Buffer (Http)`

When `optimizeForBuffers: true` is enabled, on the other hand, the path will be:
`Buffer (Redis) ->  [same] Buffer (Distribucache) -> [same] Buffer (App) -> [same] Buffer (Http)`,
thereby avoiding taking up the extra memory by the `String` / `Object` representations
and also avoiding the CPU overhead of converting and garbage-collecting.

```javascript
var cache = cacheClient.create('nsp', {
  optimizeForBuffers: true
});
```

Once set, `cache.get()` will return a `Buffer` as the value.


### API

#### Distribucache

  - `createClient(store, config)`

Possible `config` values below.
**Note:** The following values are allowed for the config and are
also available to the `CacheClient#create`:
```
{String} [config.namespace]
{Boolean} [config.optimizeForSmallValues] defaults to false
{Boolean} [config.stopEventPropagation] defaults to false
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

#### Get

Name | Arguments | Emitted | Followed by
-----|-----------|---------|-------------
`get:before` | `key`| before the datastore is called to get a value | none
`get:stale` | `key` | when an element exceeds its `staleIn` time | `populate`
`get:expire` | `key` | when an element exceeds its `expireIn` time | `del`
`get:hit` | `key` | when an element exceeds its `expireIn` time  | none
`get:miss` | `key` | when an element is not in the cache | `populate`
`get:after` | `key, elapsedTimeInMs` | after the datastore returns a value or an error | none
`get:error` | `key` | when a datastore returns an error | none

#### Set

Name | Arguments | Emitted | Followed by
-----|-----------|---------|-------------
`set:before` | `key, value` | before the datastore is called to set a value | none
`set:identical` | `key, value` | when a value that is being set is identical to the one in the datastore. | none
`set:after` | `key, value, elapsedTimeInMs` | after the datastore is done setting a value | none
`set:error` | `key, value` | when a datastore returns an error | none

#### Del

Name | Arguments | Emitted | Followed by
-----|-----------|---------|-------------
`del:before` | `key` | before the datastore is called to delete a value | none
`del:after` | `key, elapsedTimeInMs` | after the datastore is done deleting an element | none
`del:error` | `key` | when a datastore returns an error | none

#### Populate

Name | Arguments | Emitted | Followed by
-----|-----------|---------|-------------
`populate:before` | `key` | before distribucache attempts to populate a value | none
`populate:after` | `key, elapsedTimeInMs` | after distribucahce populates a value or returns an error | none
`populate:error` | `key` | when a datastore returns an error | none

#### PopulateIn

Name | Arguments | Emitted | Followed by
-----|-----------|---------|-------------
`populateIn:before` | `key` | before distribucache attempts to populate a value (on the `populateIn` interval) | `populate`
`populateIn:pause` | `key` | when the cache hasn't been re-populated within the `pausePopulateIn` time | none
`populateIn:maxAttempts` | `key` | when the cache reached the maximum number of attempts to populate (as configured by `populateInAttempts`) | none
`populateIn:after` | `key, elapsedTimeInMs` | after distribucache is done setting a value or returns an error | none
`populateIn:error` | `key` | when a datastore returns an error  | none


### Human-readable Time Intervals

The time intervals in this library can be provided as a `number`
in milliseconds **or** as a human-readable time interval.

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
