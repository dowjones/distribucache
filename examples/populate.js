/* eslint no-console: 0 */

var distribucache = require('../lib'),
  //memoryStore = require('distribucache-memory-store'),
  //store = memoryStore(),
  redisStore = require('distribucache-redis-store'),
  logEvents = require('distribucache-console-logger'),
  store = redisStore({namespace: 'ex', host: 'localhost', port: 6379}),
  cacheClient = distribucache.createClient(store),
  cache;

cache = cacheClient.create('randomness', {
  staleIn: '10 sec',
  populateIn: '5 sec',
  pausePopulateIn: '1 min',
  populate: function (key, cb) {
    setTimeout(function () {
      var value = Math.round(Math.random() * 1000);
      console.log('[client] populating with:', value);
      cb(null, value);
    }, 250);
  }
});

logEvents(cache);

function doIt() {
  var t = Date.now();
  cache.get('k8', function (err, value) {
    if (err) return console.error('[client] ', err);
    console.log('[client] got `%j` (type: %s) in %dms',
      value, typeof value, Date.now() - t);
  });
}

setInterval(doIt, 2000);
doIt();
