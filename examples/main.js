var distribucache = require('../lib'),
  cacheClient = distribucache.createClient({
    host: 'localhost',
    port: 6379
  }),
  cache;

cache = cacheClient.create('randomness', {
  staleIn: '10 sec',
  //populateIn: '5 sec',
  //pausePopulateIn: '1 min',
  populate: function (key, cb) {
    setTimeout(function () {
      var value = Math.round(Math.random() * 1000);
      console.log('[client] populating with:', value);
      cb(null, value);
    }, 250);
  }
});

function doIt() {
  var t = Date.now();
  cache.get('k8', function (err, value) {
    if (err) return console.error('[client] ', err);
    console.log('[client] got "%s" in %dms',
      value, Date.now() - t);
  });
}

setInterval(doIt, 2000);
doIt();
