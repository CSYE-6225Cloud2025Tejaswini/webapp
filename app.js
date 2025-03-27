// app.js - modify your existing file
require("dotenv").config();
const express = require("express");
const healthRoutes = require("./routes/healthcheck");
const { applyHeaders } = require("./utils/headers");
const fileRoutes = require("./routes/file");
const { requestLogger, errorHandler } = require('./utils/middleware');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8080;

// Add request logging middleware
app.use(requestLogger);

// Middleware to handle JSON payloads with error handling
app.use(
  express.json({
    verify: (req, res, buf) => {
      if (buf.length) {
        try {
          JSON.parse(buf);
        } catch {
          logger.error("Invalid JSON payload received");
          res.status(400).send("Invalid JSON");
          throw new Error("Invalid JSON payload");
        }
      }
    },
  })
);

// Mount health check routes
app.use("/", healthRoutes);
app.use("/", fileRoutes);

// Handle unknown routes
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  applyHeaders(res);
  res.status(404).send("Not Found");
});

// Error handling middleware
app.use(errorHandler);

// Process termination handlers
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { error });
  // Allow time for logs to be written before exiting
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

module.exports = app;