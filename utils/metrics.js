const StatsD = require("hot-shots");
const os = require("os");

// Set up a StatsD client that will send metrics to CloudWatch via the agent
const statsd = new StatsD({
  host: "localhost",
  port: 8125,
  prefix: "webapp.",
  globalTags: { 
    env: process.env.NODE_ENV || "development",
    instance: os.hostname()
  },
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
  
  // System metrics for auto-scaling
  recordSystemMetrics: () => {
    // CPU Usage
    const cpuLoad = os.loadavg()[0];
    statsd.gauge('system.cpu.load', cpuLoad);
    
    // Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    statsd.gauge('system.memory.used_percent', memoryUsagePercent);
    
    // API Request Rate
    statsd.gauge('system.api.request_rate', global.requestCount || 0);
    global.requestCount = 0;  // Reset counter
  }
};

// Start periodic collection of system metrics
global.requestCount = 0;

// Collect system metrics every minute
setInterval(() => {
  metrics.recordSystemMetrics();
}, 60000);

module.exports = metrics;