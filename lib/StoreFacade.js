module.exports = StoreFacade;

function StoreFacade(store, namespace) {
  this._store = store;
  this._namespace = namespace;
}

StoreFacade.prototype.createLease = function (ttl) {
  var lease = this._store.createLease(ttl),
    self = this;
  return function (key, cb) {
    lease(self._toStoreKey(key), cb);
  };
};

StoreFacade.prototype.createTimer = function () {
  return this._store.createTimer(this._namespace);
};

StoreFacade.prototype.on = function (eventName, cb) {
  this._store.on(eventName, cb);
};

StoreFacade.prototype.del = function (key, cb) {
  this._store.del(this._toStoreKey(key), cb);
};

StoreFacade.prototype.expire = function (key, ttlInMs, cb) {
  this._store.expire(this._toStoreKey(key), ttlInMs, cb);
};

StoreFacade.prototype.getAccessedAt = function (key, cb) {
  this._store.get(this._toStoreKey(key), 'accessedAt', toNumber(cb));
};

StoreFacade.prototype.getCreatedAt = function (key, cb) {
  this._store.get(this._toStoreKey(key), 'createdAt', toNumber(cb));
};

StoreFacade.prototype.getHash = function (key, cb) {
  this._store.get(this._toStoreKey(key), 'hash', cb);
};

StoreFacade.prototype.getValue = function (key, cb) {
  this._store.get(this._toStoreKey(key), 'value', cb);
};

StoreFacade.prototype.setAccessedAt = function (key, date, cb) {
  this._store.set(this._toStoreKey(key), 'accessedAt', date, cb);
};

StoreFacade.prototype.setCreatedAt = function (key, date, cb) {
  this._store.set(this._toStoreKey(key), 'createdAt', date, cb);
};

StoreFacade.prototype.setHash = function (key, hash, cb) {
  this._store.set(this._toStoreKey(key), 'hash', hash, cb);
};

StoreFacade.prototype.setValue = function (key, value, cb) {
  this._store.set(this._toStoreKey(key), 'value', value, cb);
};

/**
 * Get namespaced key that
 * will be used when accessing
 * the store.
 *
 * @protected
 * @returns {String}
 */

StoreFacade.prototype._toStoreKey = function (key) {
  return this._namespace + ':' + key;
};

function toNumber(cb) {
  return function (err, value) {
    if (err) return cb(err);
    if ('number' === typeof value) return cb(null, value);
    cb(null, value && parseInt(value, 10));
  };
}
