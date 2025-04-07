require("dotenv").config(); // Load environment variables

const express = require("express");
const { sequelize } = require("./models");
const healthcheckRoutes = require("./routes/healthcheck");
const fileRoutes = require("./routes/file");
const { createDatabaseIfNotExists } = require("./utils/database");
const { setCommonHeaders } = require("./utils/headers");
const logger = require("./utils/logger");
const metrics = require("./utils/metrics");

const app = express();
const PORT = process.env.PORT || 8080;

// ---------------------------------------------
// Request Logging Middleware
// Logs method, path, IP, and response time
// ---------------------------------------------
app.use((req, res, next) => {
  const startTime = process.hrtime();

  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

// Request counter middleware for auto-scaling metrics
app.use((req, res, next) => {
  global.requestCount = (global.requestCount || 0) + 1;
  next();
});

  res.on("finish", () => {
    const diff = process.hrtime(startTime);
    const responseTime = diff[0] * 1000 + diff[1] / 1e6;
    logger.info(`Request completed: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
    });
  });

  next();
});

// --------------------------------------------------
// JSON Parsing Middleware with Validation
// Prevents invalid JSON payloads from crashing the app
// --------------------------------------------------
app.use(
  express.json({
    verify: (req, res, buf) => {
      if (buf.length > 0) {
        try {
          JSON.parse(buf); // Validate JSON manually
        } catch (e) {
          logger.error(`Invalid JSON received: ${e.message}`);
          res.status(400).end();
          throw new Error("Invalid JSON");
        }
      }
    },
  })
);

// --------------------
// Route Registrations
// --------------------
app.use("/", healthcheckRoutes); // Healthcheck route
app.use("/", fileRoutes);        // File upload/retrieve/delete routes

// --------------------
// 404 Handler
// --------------------
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  metrics.countApiCall("notFound");
  setCommonHeaders(res);
  res.status(404).end();
});

// --------------------
// Global Error Handler
// --------------------
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    logger.error(`Syntax Error: ${err.message}`, { error: err.stack });
    return res.status(400).end();
  }

  logger.error(`Server Error: ${err.message}`, { error: err.stack });
  metrics.countApiCall("serverError");
  return res.status(500).end();
});

// -----------------------------
// Server Startup Function
// -----------------------------
async function startServer() {
  try {
    logger.info("Starting server initialization");

    // Create the DB if it doesn't exist
    logger.info("Creating database if it doesn't exist");
    await createDatabaseIfNotExists();

    // Sync Sequelize models
    logger.info("Syncing database models");
    await sequelize.sync(); // For production: use migrations instead of sync
    logger.info("Database synced successfully");

    // Start the Express server
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
    
    // Add graceful shutdown handler
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received. Closing HTTP server.');
      server.close(() => {
        logger.info('HTTP server closed.');
        sequelize.close().then(() => {
          logger.info('Database connections closed.');
          process.exit(0);
        }).catch(err => {
          logger.error('Error closing database connections:', err);
          process.exit(1);
        });
      });
    });
    
    return server;
  } catch (error) {
    logger.error(`Unable to start server: ${error.message}`, {
      error: error.stack,
    });
    process.exit(1); // Exit with failure
  }
}

// ------------------------------------
// Global Error Handling (Process Level)
// ------------------------------------

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", {
    reason: reason.toString(),
    stack: reason.stack || "No stack trace available",
  });
});

// Catch uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", {
    error: error.toString(),
    stack: error.stack || "No stack trace available",
  });
  process.exit(1); // Exit immediately to avoid running in inconsistent state
});

// Start the app
startServer();

module.exports = app;