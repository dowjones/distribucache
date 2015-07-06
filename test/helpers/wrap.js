var slice = Array.prototype.slice;

module.exports = function (workCb, doneCb) {
  return function (err) {
    if (err) return doneCb(err);
    var args = slice.call(arguments);
    args.shift();
    workCb.apply(null, args);
    doneCb();
  };
};
