require("dotenv").config();
const express = require("express");
const { sequelize } = require("./models");
const healthcheckRoutes = require("./routes/healthcheck");
const { createDatabaseIfNotExists } = require("./utils/database");
const { setCommonHeaders } = require("./utils/headers");
const fileRoutes = require("./routes/file");
const logger = require("./utils/logger");
const metrics = require("./utils/metrics");

const app = express();
const PORT = process.env.PORT || 8080;

// Request logging middleware
app.use((req, res, next) => {
  const startTime = process.hrtime();

  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Add response finished listener
  res.on("finish", () => {
    const diff = process.hrtime(startTime);
    const responseTime = diff[0] * 1000 + diff[1] / 1000000; // Convert to milliseconds

    logger.info(`Request completed: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
    });
  });

  next();
});

app.use(
  express.json({
    verify: (req, res, buf) => {
      if (buf.length > 0) {
        try {
          JSON.parse(buf);
        } catch (e) {
          logger.error(`Invalid JSON received: ${e.message}`);
          res.status(400).end();
          throw new Error("Invalid JSON");
        }
      }
    },
  })
);

app.use("/", healthcheckRoutes);
app.use("/", fileRoutes);

// 404 handler
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  metrics.countApiCall("notFound");
  setCommonHeaders(res);
  res.status(404).end();
});

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    logger.error(`Syntax Error: ${err.message}`, { error: err.stack });
    return res.status(400).end();
  }
  logger.error(`Server Error: ${err.message}`, { error: err.stack });
  metrics.countApiCall("serverError");
  return res.status(500).end();
});

module.exports = app;
