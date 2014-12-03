# Distribucache

Redis-backed automatically-repopulating cache. This cache does everything in
it's power to shield the caller from the delays of the downstream services. It has a unque
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
  cache = dc.create();

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


### Populating

A common pattern is to call the `get` first, and if the item is not
in the cache, call `set`. For this common pattern, you can provide
a `populate` function when creating the cache. On a `get`, if the
cache is empty your `populate` function will be called to populate the
cache, and then the flow will continue to the `get` callback. This ensures
that the `get` always returns a value, either from the cache or from
the downstream service.

```javascript
var cache = dc.create({
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
var cache = dc.create({
  expiresIn: 2000  // 2 seconds
});
```

A `staleIn` can also be set. It acts as a low-water-mark. When a value
is stale it is still returned as is to the caller. Two additional things happen:
(a) the `stale` event is called (with `key` as the argument) and (b) the `populate`
is called in the background if it is provided; allowing the next `get` call to
get a fresh value, without incurring the delay of accessing a downstream service.

```javascript
var cache = dc.create({
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
var cache = dc.create({
  populateIn: 1000  // 1 second
  pausePopulateIn: 1000 * 60  // 1 minute
});
```

*Note:* this feature will work even with disruptions to the service, as the burder
of determining which keys need to be re-populated is on Redis (using a combination
of keyspace events and expiring keys).


### Possible Configuration

```
{Object} [config]

{String} [config.host] defaults to 'localhost'
{Number} [config.port] defaults to 6379
{String} [config.password]
{String} [config.namespace]

{String} [config.optimizeForSmallValues] defaults to false

{String} [config.expiresIn] in ms
{String} [config.staleIn] in ms

{Function} [config.populate]

{Number} [config.populateIn] in ms, defaults to 30sec
{Number} [config.pausePopulateIn] in ms
{Number} [config.leaseExpiresIn] in ms
{Number} [config.accessedAtThrottle] in ms
{Number} [config.namespace]
```


### Emitted Events

The following events are emmitted *before* the actual call is completed:

  - `get` - `(key)`
  - `set` - `(key, value)`
  - `del` -  `(key)`
  - `stale` - `(key)` - emitted on a get, when the value is in the cache but is stale. This happens only when the `staleIn` is set.

`error` is also emitted by various feature decorators. It is a good idea to listen
to this event, as otherwise the built-in `EventEmitter` will throw
the error.


### Human-readable Time Intervals

The time intervals in this library can be provided as a `number`
in milliseconds *or* as a human-readible interval.

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
