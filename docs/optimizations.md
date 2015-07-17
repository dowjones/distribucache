# Optimizations

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
