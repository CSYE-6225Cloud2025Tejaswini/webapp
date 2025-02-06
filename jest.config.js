module.exports = {
    testEnvironment: "node",
    testMatch: ["**/tests/**/*.test.js"],
    coverageDirectory: "coverage",
    collectCoverageFrom: [
      "controllers/**/*.js",
      "routes/**/*.js",
      "utils/**/*.js",
      "!**/node_modules/**",
    ],
    setupFilesAfterEnv: ["./tests/setup.js"],
  };