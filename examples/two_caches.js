var distribucache = require('../lib'),
  memoryStore = require('distribucache-memory-store'),
  store = memoryStore(),
  //redisStore = require('distribucache-redis-store'),
  //store = redisStore({namespace: 'ex', host: 'localhost', port: 6379}),
  cacheClient = distribucache.createClient(store),
  numCache, strCache;

numCache = cacheClient.create('num:v1', {
  populateIn: '10 sec',
  pausePopulateIn: '1 min',
  populate: function (key, cb) {
    var num = Math.floor(Math.random() * 10);
    console.log('[populate] NUM', num);
    cb(null, num);
  }
});

strCache = cacheClient.create('str:v1', {
  populateIn: '3 sec',
  pausePopulateIn: '1 min',
  populate: function (key, cb) {
    var alphanum =  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      word = '';
    for (var i = 0; i < 5; i++) {
      word += alphanum.charAt(Math.floor(
        Math.random() * alphanum.length));
    }
    console.log('[populate] STRING', word);
    cb(null, word);
  }
});

function main() {
  numCache.get('k', function (err, v) {
    if (err) return console.error('[client]', err);
    if ('number' !== typeof v) throw new Error('not number');
    console.log('[client]', v);
  });

  strCache.get('k', function (err, v) {
    if (err) return console.error('[client]', err);
    if ('string' !== typeof v) throw new Error('not string');
    console.log('[client]', v);
  });
}

setInterval(main, 2000);
main();
