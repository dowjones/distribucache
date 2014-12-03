var CacheClient = require('./CacheClient');

exports.createClient = function (config) {
  return new CacheClient(config);
};
