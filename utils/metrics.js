// utils/metrics.js
const StatsD = require('node-statsd');
const logger = require('./logger');

// Initialize StatsD client to send metrics to CloudWatch
const statsd = new StatsD({
  host: 'localhost',
  port: 8125,
  prefix: 'webapp_'
});

// Error handling
statsd.socket.on('error', function(error) {
  logger.error(`StatsD error: ${error}`);
});

const metrics = {
  // Record API calls
  countApiCall: (endpoint) => {
    statsd.increment(`api.${endpoint}.count`);
  },
  
  // Time API calls
  timeApiCall: (endpoint, startTime) => {
    const duration = Date.now() - startTime;
    statsd.timing(`api.${endpoint}.time`, duration);
    return duration;
  },
  
  // Time database queries
  timeDbQuery: (operation, startTime) => {
    const duration = Date.now() - startTime;
    statsd.timing(`db.${operation}.time`, duration);
    return duration;
  },
  
  // Time S3 operations
  timeS3Operation: (operation, startTime) => {
    const duration = Date.now() - startTime;
    statsd.timing(`s3.${operation}.time`, duration);
    return duration;
  }
};

module.exports = metrics;