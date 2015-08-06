var log = require('bole')('dispatcher');
var config = require('./config');
var Yo = require('ympc-yo');
var kue = require('kue');

module.exports = server;

function isErrorCode (code) {
  return function (err) {
    return err.statusCode === code;
  }
}

function server (config) {
  var yo = new Yo(config.get('yo.apikey'));
  var db = require('./dbclient');

  var q = config.get('redis.socket')
    ? kue.createQueue({
        prefix: 'queue',
        redis: {
          socket: config.get('redis.socket'),
          auth: config.get('redis.password')
        }
      })

    : kue.createQueue({
      prefix: 'queue',
      redis: {
        port: config.get('redis.port'),
        host: config.get('redis.host'),
        auth: config.get('redis.password')
      }
    });

  function start () {
    log.info('started');

    q.process('sendyo', function (job, done) {
      log.info('processing sendyo#' + job.id);

      yo.yoLink(job.data.userId, job.data.link)
        .then(function () {
          log.info('sendyo#' + job.id, 'succeeded');
          db.resetYoFailCount (job.data.userId);
          done();
        })
        .catch(isErrorCode(404), function (err) {
          log.error('sendyo#' + job.id, 'failed:', err.message, err.error.error);
          db.incrementYoFailCount(job.data.userId);
          done(err);
        })
        .catch(isErrorCode(403), function (err) {
          log.error('sendyo#' + job.id, 'failed:', err.message, err.error.error);
          db.incrementYoFailCount(job.data.userId);
          done(err);
        })
        .catch(function (err) {
          log.error('sendyo#' + job.id, 'failed:', err.message, err.error.error);
          done(err);
        });
    });

    process.once('SIGTERM', function (sig) {
      log.info('shutting down');
      q.shutdown(2000, function (err) {
        if (err) {
          log.error('shutdown failed:', err);
          return process.exit(1);
        }

        process.exit(0);
      });
    });
  }

  return {
    start: start
  };
}
