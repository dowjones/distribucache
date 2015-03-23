module.exports = NamespacedStore;

function NamespacedStore(store, namespace) {
  this._store = store;
  this._namespace = namespace;
}

NamespacedStore.prototype.createLease = function (ttl) {
  var lease = this._store.createLease(ttl),
    self = this;
  return function (key, cb) {
    lease(self._toStoreKey(key), cb);
  };
};

NamespacedStore.prototype.createTimer = function () {
  return this._store.createTimer(this._namespace);
};

NamespacedStore.prototype.on = function (eventName, cb) {
  this._store.on(eventName, cb);
};

NamespacedStore.prototype.del = function (key, cb) {
  this._store.del(this._toStoreKey(key), cb);
};

NamespacedStore.prototype.getAccessedAt = function (key, cb) {
  this._store.getAccessedAt(this._toStoreKey(key), cb);
};

NamespacedStore.prototype.getCreatedAt = function (key, cb) {
  this._store.getCreatedAt(this._toStoreKey(key), cb);
};

NamespacedStore.prototype.getHash = function (key, cb) {
  this._store.getHash(this._toStoreKey(key), cb);
};

NamespacedStore.prototype.getValue = function (key, cb) {
  this._store.getValue(this._toStoreKey(key), cb);
};

NamespacedStore.prototype.setAccessedAt = function (key, date, cb) {
  this._store.setAccessedAt(this._toStoreKey(key), date, cb);
};

NamespacedStore.prototype.setCreatedAt = function (key, date, cb) {
  this._store.setCreatedAt(this._toStoreKey(key), date, cb);
};

NamespacedStore.prototype.setHash = function (key, hash, cb) {
  this._store.setHash(this._toStoreKey(key), hash, cb);
};

NamespacedStore.prototype.setValue = function (key, value, cb) {
  this._store.setValue(this._toStoreKey(key), value, cb);
};

/**
 * Get namespaced key that
 * will be used when accessing
 * the store.
 *
 * @protected
 * @returns {String}
 */

NamespacedStore.prototype._toStoreKey = function (key) {
  return this._namespace + ':' + key;
};
