const { HealthCheck, sequelize } = require("../models");
const { setCommonHeaders } = require("../utils/headers");
const logger = require("../utils/logger");
const metrics = require("../utils/metrics");

class HealthcheckController {
  static async getHealthCheck(req, res) {
    const startTime = metrics.startApiTimer("healthCheck");
    setCommonHeaders(res);

    try {
      metrics.countApiCall("healthCheck");
      logger.info("Health check request received");

      if (Object.keys(req.query).length > 0) {
        logger.warn("Health check attempted with query parameters");
        metrics.endApiTimer("healthCheck", startTime);
        return res.status(400).end();
      }

      if (Object.keys(req.body).length > 0) {
        logger.warn("Health check attempted with request body");
        metrics.endApiTimer("healthCheck", startTime);
        return res.status(400).end();
      }

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
      ];

      const customHeaders = Object.keys(req.headers).filter(
        (header) => !standardHeaders.includes(header.toLowerCase())
      );

      if (customHeaders.length > 0) {
        logger.warn(
          `Health check attempted with custom headers: ${customHeaders.join(
            ", "
          )}`
        );
        metrics.endApiTimer("healthCheck", startTime);
        return res.status(400).end();
      }

      // Test database connection
      const dbStartTime = process.hrtime();
      await sequelize.authenticate();
      await HealthCheck.create({
        datetime: new Date(),
      });
      const dbDiff = process.hrtime(dbStartTime);
      const dbTimeMs = dbDiff[0] * 1000 + dbDiff[1] / 1000000;
      metrics.recordDbQueryTime("healthCheckDb", dbTimeMs);

      const responseTime = metrics.endApiTimer("healthCheck", startTime);
      logger.info(`Health check successful, response time: ${responseTime}ms`);

      return res.status(200).end();
    } catch (error) {
      logger.error(`Health check failed: ${error.message}`, {
        error: error.stack,
      });
      metrics.endApiTimer("healthCheck", startTime);
      return res.status(503).end();
    }
  }

  static handleUnsupportedMethods(req, res) {
    metrics.countApiCall("unsupportedMethod");
    setCommonHeaders(res);
    logger.warn(
      `Unsupported method ${req.method} requested for path: ${req.path}`
    );
    res.status(405).end();
  }
}

module.exports = HealthcheckController;
