# Events

### CacheClient-emitted Events

Name | Arguments | Emitted
-----|-----------|--------
`create` | `cache, namespace` | when the `CacheClient#create` method is called
`error` | `err, namespace` | on errors

The `CacheClient` `error` event is propagated from the `Cache`s created by the client.


### Cache-emitted Events

The events below are emitted by the `Cache` created by
the `create` method of the `CacheClient`.

Name | Arguments | Emitted | Followed by
-----|-----------|---------|-------------
`get:before` | `key`| before the datastore is called to get a value | none
`get:stale` | `key` | when an element exceeds its `staleIn` time | `populate`
`get:expire` | `key` | when an element exceeds its `expireIn` time | `del`
`get:hit` | `key` | when an element exceeds its `expireIn` time  | none
`get:miss` | `key` | when an element is not in the cache | `populate`
`get:after` | `key, elapsedTimeInMs` | after the datastore returns a value or an error | none
`get:error` | `err, key` | when a datastore returns an error | none
| | | |
| | | |
`set:before` | `key, value` | before the datastore is called to set a value | none
`set:identical` | `key, value` | when a value that is being set is identical to the one in the datastore. | none
`set:after` | `key, value, elapsedTimeInMs` | after the datastore is done setting a value | none
`set:error` | `err, key, value` | when a datastore returns an error | none
| | | |
| | | |
`del:before` | `key` | before the datastore is called to delete a value | none
`del:after` | `key, elapsedTimeInMs` | after the datastore is done deleting an element | none
`del:error` | `err, key` | when a datastore returns an error | none
| | | |
| | | |
`populate:before` | `key` | before distribucache attempts to populate a value | `set`
`populate:after` | `key, elapsedTimeInMs` | after distribucahce populates a value or returns an error | none
`populate:error` | `err, key` | when a datastore returns an error | none
| | | |
| | | |
`populateIn:before` | `key` | before distribucache attempts to populate a value (on the `populateIn` interval) | `populate`
`populateIn:pause` | `key` | when the cache hasn't been re-populated within the `pausePopulateIn` time | none
`populateIn:maxAttempts` | `key` | when the cache reached the maximum number of attempts to populate (as configured by `populateInAttempts`) | none
`populateIn:after` | `key, elapsedTimeInMs` | after distribucache is done setting a value or returns an error | none
`populateIn:error` | `err, key` | when a datastore returns an error  | none
