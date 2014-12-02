var Cache = require('../lib/cache/Base');
var ExpireDecorator = require('../lib/cache/ExpireDecorator');
var PopulateDecorator = require('../lib/cache/PopulateDecorator');


var cache = new Cache({
  //populate: function (key, cb) {
    //console.log('[client] populating key:', key);
    //setTimeout(function () {
      //cb(null, Math.random());
      ////cb(null, 'v1');
    //}, 1000);
  //}
});

cache = new PopulateDecorator(cache, {
  populate: function (key, cb) {
    setTimeout(function () {
      cb(null, Math.random());
    }, 1000);
  }
});

function doIt() {
  var t = Date.now();
  cache.get('k2', function (err, value) {
    if (err) throw err;
    console.log('[client] got "%s" in %dms',
      value, Date.now() - t);
  });
}

//setInterval(doIt, 4000);
doIt();
