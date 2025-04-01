const StatsD = require("hot-shots");

// ----------------------------------------
// Initialize StatsD Client
// ----------------------------------------
// Sends metrics to the local CloudWatch agent via UDP on port 8125
const statsd = new StatsD({
  host: "localhost",
  port: 8125,
  prefix: "webapp.", // Prefix added to all metric names
  errorHandler: (error) => {
    console.error("StatsD error:", error);
  },
});

// ----------------------------------------
// Custom Metric Functions
// ----------------------------------------
const metrics = {
  // Increment counter for API endpoint hits
  countApiCall: (endpoint) => {
    statsd.increment(`api.${endpoint}.count`);
  },

  // Start high-resolution timer (returns process.hrtime value)
  startApiTimer: (endpoint) => {
    return process.hrtime(); // Returns [seconds, nanoseconds]
  },

  // End timer and record duration in milliseconds
  endApiTimer: (endpoint, startTime) => {
    const diff = process.hrtime(startTime);
    const time = diff[0] * 1000 + diff[1] / 1e6; // Convert to milliseconds
    statsd.timing(`api.${endpoint}.time`, time);
    return time;
  },

  // Log database query execution time
  recordDbQueryTime: (queryName, timeMs) => {
    statsd.timing(`db.query.${queryName}.time`, timeMs);
  },

  // Log S3-related operation execution time
  recordS3OperationTime: (operation, timeMs) => {
    statsd.timing(`s3.operation.${operation}.time`, timeMs);
  },
};

module.exports = metrics;
