var defaults = {
  redis: {
    socket: null,
    host: '127.0.0.1',
    port: 6379,
    password: null
  },

  yo: {
    apikey: 'yo-api-key'
  }
};

var aliases = {
  d: 'debug',
  v: 'version'
};

module.exports = require('rucola')('ympc-dispatcher', defaults, aliases);
