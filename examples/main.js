var dc = require('../lib'),
  cache;

cache = dc.create({
  expiresIn: 5000,
  staleIn: 2000,
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
