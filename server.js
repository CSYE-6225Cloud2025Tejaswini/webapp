const app = require("./app");
const { sequelize } = require("./models");
const { createDatabaseIfNotExists } = require("./utils/database");
const logger = require("./utils/logger");
const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    logger.info("Starting server initialization");

    logger.info("Creating database if it doesn't exist");
    await createDatabaseIfNotExists();

    logger.info("Syncing database models");
    await sequelize.sync();
    logger.info("Database synced successfully");

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Unable to start server: ${error.message}`, {
      error: error.stack,
    });
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection:", {
    reason: reason.toString(),
    stack: reason.stack || "No stack trace available",
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", {
    error: error.toString(),
    stack: error.stack || "No stack trace available",
  });
  process.exit(1);
});

startServer();
