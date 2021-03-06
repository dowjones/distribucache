/* eslint no-console: 0 */

var http = require('http'),
  dcache = require('../lib'),
  dstore = require('distribucache-redis-store'),
  //dstore = require('distribucache-memory-store'),
  cacheClient = dcache.createClient(dstore()),
  server, cache;

cache = cacheClient.create('page', {
  staleIn: '5 sec',
  populate: generatePage,
  optimizeForBuffers: true
});

server = http.createServer(function (req, res) {
  cache.get('home', function (err, page) {
    if (err) {
      res.writeHead(500);
      res.end(err.message);
      return;
    }

    res.writeHead(200);
    res.end(page);
  });
});

function generatePage(pageId, cb) {
  console.log('[page] generating...');

  setTimeout(function () {
    cb(null, new Buffer('<p>Hello world!</p>'));
  }, 300);
}

server.listen(2000, function () {
  console.log('on :2000');
});
