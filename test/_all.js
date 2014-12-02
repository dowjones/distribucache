var requireDirectory = require('require-directory');


/**
 * This file makes sure all files have been tested.
 * Include all newly created source directories here.
 */

module.exports = requireDirectory(module, '../lib');
