const StatsD = require("hot-shots");

// Set up a StatsD client that will send metrics to CloudWatch via the agent
const statsd = new StatsD({
  host: "localhost",
  port: 8125,
  prefix: "webapp.",
  errorHandler: (error) => {
    console.error("StatsD error:", error);
  },
});

// Custom metric functions
const metrics = {
  // Count metrics for API calls
  countApiCall: (endpoint) => {
    statsd.increment(`api.${endpoint}.count`);
  },

  // Timer metrics for API response time
  startApiTimer: (endpoint) => {
    return process.hrtime();
  },

  endApiTimer: (endpoint, startTime) => {
    const diff = process.hrtime(startTime);
    const time = diff[0] * 1000 + diff[1] / 1000000; // Convert to milliseconds
    statsd.timing(`api.${endpoint}.time`, time);
    return time;
  },

  // Database query timing
  recordDbQueryTime: (queryName, timeMs) => {
    statsd.timing(`db.query.${queryName}.time`, timeMs);
  },

  // S3 operation timing
  recordS3OperationTime: (operation, timeMs) => {
    statsd.timing(`s3.operation.${operation}.time`, timeMs);
  },
};

module.exports = metrics;
