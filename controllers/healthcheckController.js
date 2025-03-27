// controllers/healthcheckController.js - modify your existing file
const HealthCheck = require("../models/healthcheck");
const { sequelize } = require('../utils/database');
const { applyHeaders } = require("../utils/headers");
const logger = require("../utils/logger");

class HealthStatusController {
  static async fetchHealthStatus(req, res) {
    logger.info("Health check request received");
    
    await sequelize.sync({force: false});
    applyHeaders(res);

    if (Object.keys(req.query).length || Object.keys(req.body).length) {
      logger.warn("Health check request rejected due to query parameters or body");
      return res.status(400).end();
    }

    const defaultHeaders = [
      "host", "user-agent", "accept", "connection", "content-type",
      "content-length", "postman-token", "accept-encoding", "accept-language",
    ];

    const additionalHeaders = Object.keys(req.headers).filter(
      (header) => !defaultHeaders.includes(header.toLowerCase())
    );

    if (additionalHeaders.length > 0) {
      logger.warn(`Health check request rejected due to custom headers: ${additionalHeaders.join(', ')}`);
      return res.status(400).end();
    }

    try {
      logger.info("Authenticating database connection");
      await sequelize.authenticate();
      
      logger.info("Logging health check in database");
      await HealthCheck.create({
        timestamp: new Date(),
      });

      logger.info("Health check completed successfully");
      return res.status(200).end();
    } catch (err) {
      logger.error(`Health check failed: ${err.message}`, { error: err });
      return res.status(503).end();
    }
  }

  static unsupportedMethods(req, res) {
    logger.warn(`Unsupported HTTP method for health check: ${req.method}`);
    applyHeaders(res);
    res.status(405).end();
  }
}

module.exports = HealthStatusController;