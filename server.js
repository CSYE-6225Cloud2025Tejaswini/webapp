// server.js - modify your existing file
const app = require("./app");
const { connectToDatabase, sequelize } = require("./utils/database");
const logger = require('./utils/logger');
const PORT = process.env.PORT || 8080;

async function launchServer() {
  try {
    // Ensure the database is initialized and synchronized
    logger.info("Initializing database connection...");
    await connectToDatabase();
    await sequelize.sync({force: false});
    logger.info("Database initialized and synchronized successfully");

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Application is live on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Server startup failed: ${err.message}`, { error: err });
    process.exit(1);
  }
}

launchServer();