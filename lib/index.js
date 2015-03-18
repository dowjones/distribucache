var CacheClient = require('./CacheClient');

exports.createClient = function (store, config) {
  return new CacheClient(store, config);
};
