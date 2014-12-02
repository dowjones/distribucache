var Cache = require('../lib/cache/Cache');
var ExpireDecorator = require('../lib/cache/ExpireDecorator');
var PopulateDecorator = require('../lib/cache/PopulateDecorator');


var cache = new Cache();

cache = new ExpireDecorator(cache, {
  expiresIn: 5000,
  staleIn: 2000
});

cache = new PopulateDecorator(cache, {
  populate: function (key, cb) {
    setTimeout(function () {
      cb(null, Math.random());
    }, 250);
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
