var all = require('./_all'),
  create = require('sinon-lazy-stub');

module.exports = {
  cache: create(all.Cache),
  decorators: {
    expire: create(all.decorators.ExpireDecorator),
    expire: create(all.decorators.ExpireDecorator),
  }
};
