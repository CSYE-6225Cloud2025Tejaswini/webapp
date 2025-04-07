const { HealthCheck, sequelize } = require("../models");
const { setCommonHeaders } = require("../utils/headers");
const logger = require("../utils/logger");
const metrics = require("../utils/metrics");

class HealthcheckController {
  // Handle GET /healthz request for health checks
  static async getHealthCheck(req, res) {
    const startTime = metrics.startApiTimer("healthCheck");
    setCommonHeaders(res);

    try {
      metrics.countApiCall("healthCheck");
      logger.info("Health check request received");
      // Reject request if any query parameters are present
      if (Object.keys(req.query).length > 0) {
        logger.warn("Health check attempted with query parameters");
        metrics.endApiTimer("healthCheck", startTime);
        return res.status(400).end();
      }
      // Reject request if body is not empty
      if (Object.keys(req.body).length > 0) {
        logger.warn("Health check attempted with request body");
        metrics.endApiTimer("healthCheck", startTime);
        return res.status(400).end();
      }
      // Allow only standard headers
      const standardHeaders = [
        "host",
        "user-agent",
        "accept",
        "connection",
        "content-type",
        "content-length",
        "postman-token",
        "accept-encoding",
        "accept-language",

        // AWS Load Balancer Headers
        "x-forwarded-for",
        "x-forwarded-proto",
        "x-forwarded-port",
        "x-amzn-trace-id",
        "x-forwarded-host",
        // Additional common headers
        "cache-control",
        "pragma",
        "upgrade-insecure-requests"
      ];
       // Log but don't reject requests with custom headers
       const customHeaders = Object.keys(req.headers).filter(
        (header) => !standardHeaders.includes(header.toLowerCase())
      );

      if (customHeaders.length > 0) {
        logger.info(
          `Health check received with non-standard headers: ${customHeaders.join(", ")}`
        );
        // Continue processing instead of rejecting
      }

       // Attempt DB connection and record timestamp
      const dbStartTime = process.hrtime();
      await sequelize.authenticate();
      await HealthCheck.create({
        datetime: new Date(),
      });
      const dbDiff = process.hrtime(dbStartTime);
      const dbTimeMs = dbDiff[0] * 1000 + dbDiff[1] / 1000000;
      metrics.recordDbQueryTime("healthCheckDb", dbTimeMs);
      // Log success and respond with HTTP 200
      const responseTime = metrics.endApiTimer("healthCheck", startTime);
      logger.info(`Health check successful, response time: ${responseTime}ms`);

      return res.status(200).end();
    } catch (error) {
      // Log and return HTTP 503 on failure

      logger.error(`Health check failed: ${error.message}`, {
        error: error.stack,
      });
      metrics.endApiTimer("healthCheck", startTime);
      return res.status(503).end();
    }
  }
  // Handle unsupported HTTP methods for health check route
  static handleUnsupportedMethods(req, res) {
    metrics.countApiCall("unsupportedMethod");
    setCommonHeaders(res);
    logger.warn(
      `Unsupported method ${req.method} requested for path: ${req.path}`
    );
    res.status(405).end(); // Method Not Allowed
  }
}

module.exports = HealthcheckController;
