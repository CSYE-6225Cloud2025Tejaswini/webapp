require("dotenv").config({
  path: ".env.test",
});

// Require metrics to access the stopMetricsCollection function
const metrics = require("../utils/metrics");

// Ensure any timers are cleaned up after tests
afterAll(() => {
  metrics.stopMetricsCollection();
});
 