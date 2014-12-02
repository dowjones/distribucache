var Cache = require('../lib/cache/Base');
var ExpireDecorator = require('../lib/cache/ExpireDecorator');


var cache = new Cache({
  //populate: function (key, cb) {
    //console.log('[client] populating key:', key);
    //setTimeout(function () {
      //cb(null, Math.random());
      ////cb(null, 'v1');
    //}, 1000);
  //}
});

cache = new ExpireDecorator(cache, {
  expiresIn: 5000
});

function doIt() {
  var t = Date.now();
  cache.get('k2', function (err, value) {
    if (err) throw err;


    if (null === value) {
      cache.set('k2', 'kv2', function (err) {
        console.log('[client] set "%s" in %dms',
          'kv2', Date.now() - t);
      });
    } else {
      console.log('[client] got "%s" in %dms',
        value, Date.now() - t);
    }
  });
}

//setInterval(doIt, 4000);
doIt();
