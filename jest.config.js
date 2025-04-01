module.exports = {
  // Set Node.js as the test environment (suitable for backend apps)
  testEnvironment: "node",

  // Specify which test files to run
  testMatch: ["**/tests/**/*.test.js"],

  // Output coverage report to this directory
  coverageDirectory: "coverage",

  // Include these files in coverage analysis
  collectCoverageFrom: [
    "controllers/**/*.js", // Controller logic
    "routes/**/*.js",      // Express route handlers
    "utils/**/*.js",       // Utility functions (e.g., logger, S3, metrics)
    "!**/node_modules/**", // Exclude dependencies
  ],

  // Run this setup script after the test environment is ready
  setupFilesAfterEnv: ["./tests/setup.js"],
};
