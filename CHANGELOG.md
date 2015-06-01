# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][unreleased]

## [5.0.0] - 2015-06-01
#### Removed
- (!) `Cache#set()` no longer returns the provided value.

#### Added
- Support `config.optimizeForBuffers` to skip marshalling / unmarshalling,
  as it is redundant when caching buffers.

#### Changed
- Improved README and package.json metadata.

## [4.0.0] - 2015-05-06
#### Added
- (!) Major refactoring of the store API for extensibility.
- Support `config.populateInAttempts` to control the maximum number of attempts.

#### Changed
- Release the lease regardless of populate errors.
- Clean up long populate stack traces.

## [3.1.0] - 2015-04-24
#### Added
- Support `config.timeoutPopulateIn` and increase the lease-expire timeout
  to `timeoutPopulateIn + 1 sec`.

## [3.0.3] - 2015-03-23
#### Changed
- Refactored timer strategy.

## [3.0.2] - 2015-03-23
#### Changed
- Returned (lost in datastore transition) cache namespace.
- Marshall undefined value as `null`.

## [3.0.1] - 2015-03-19
#### Changed
- Log possible errors while attempting to delete an expired value.

## [3.0.0] - 2015-03-18
#### Added
- (!) Distribucache is now **datastore independent**! There are two backing stores available:
  [Redis](https://github.com/dowjones/distribucache-redis-store) and
  [Memory](https://github.com/dowjones/distribucache-memory-store).

## [2.6.2] - 2015-02-20
#### Changed
- Ensure that the hash is only set after the value is set. Otherwise, it was possible
  for the hash to be update and the value not updated, causing stale values to appear
  for longer than desired.

## [2.6.1] - 2014-12-18
#### Changed
- Proxy Redis errors to the CacheClient.

## [2.6.0] - 2014-12-12
#### Changed
- Log uncaught error to `stderr` instead of throwing. Alternatively you may
  subscribe to the `error` event on the client.

## [2.5.0] - 2014-12-11
#### Added
- Support events for the CacheClient: `get`, `set`, `del`, `stale` and `error`.

## [2.3.1] - 2014-12-04
#### Changed
- Fixed Redis connection mode issue.

## [2.3.0] - 2014-12-04
#### Added
- Support environments with no "configure" (e.g., Amazon elasticache). This is done
  by attempting to configure, and if that fails `console.warn` a message to the client
  stating that manual configuration is required.

## [2.2.0] - 2014-12-04
#### Added
- (Improved performance) The populate method that is called when a value is stale will
  now be run through a time-released lock (lease). This ensures that only one client
  is involved in updating on a stale at any given time, instead of all
  clients attacking the datastore when their values are stale.

## [2.1.2] - 2014-12-04
#### Changed
- Further simplify the marshaller.

## [2.1.1] - 2014-12-04
#### Changed
- Refactoring of the marshaller.

## [2.1.0] - 2014-12-04
#### Added
- Added built-in marshalling of values.

## [2.0.0] - 2014-12-03
#### Changed
- (!) Enforce a `namespace` in the `cacheClient.create` API.
- Improved README by including the `optimizeForSmallValues` explanation.

## [1.0.0] - 2014-12-02
#### Added
- Initial release of a Redis-backed automatically-repopulating cache.


[unreleased]: https://github.com/dowjones/distribucache/compare/v5.0.0...HEAD
[5.0.0]: https://github.com/dowjones/distribucache/compare/v4.0.0...v5.0.0
[4.0.0]: https://github.com/dowjones/distribucache/compare/v3.1.0...v4.0.0
[3.1.0]: https://github.com/dowjones/distribucache/compare/v3.0.3...v3.1.0
[3.0.3]: https://github.com/dowjones/distribucache/compare/v3.0.2...v3.0.3
[3.0.2]: https://github.com/dowjones/distribucache/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/dowjones/distribucache/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/dowjones/distribucache/compare/v2.6.2...v3.0.0
[2.6.2]: https://github.com/dowjones/distribucache/compare/v2.6.1...v2.6.2
[2.6.1]: https://github.com/dowjones/distribucache/compare/v2.6.0...v2.6.1
[2.6.0]: https://github.com/dowjones/distribucache/compare/v2.5.0...v2.6.0
[2.5.0]: https://github.com/dowjones/distribucache/compare/v2.3.1...v2.5.0
[2.3.1]: https://github.com/dowjones/distribucache/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/dowjones/distribucache/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/dowjones/distribucache/compare/v2.1.2...v2.2.0
[2.1.2]: https://github.com/dowjones/distribucache/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/dowjones/distribucache/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/dowjones/distribucache/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/dowjones/distribucache/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/dowjones/distribucache/compare/5bc09c79ac8652c8a07407e803d5ddc74ebe761c...v1.0.0
