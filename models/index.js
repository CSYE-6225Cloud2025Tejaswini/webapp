const { Sequelize } = require("sequelize");
const config = require("../config/config.js");

// Determine the environment (default to development)
const env = process.env.NODE_ENV || "development";

// Ensure a valid configuration exists for the current environment
if (!config[env]) {
  throw new Error(`Database configuration invalid : ${env}`);
}

// Destructure DB config values
const { username, password, database, host, port, dialect } = config[env];

// Initialize Sequelize instance with connection parameters
const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect,
  logging: false, // Disable SQL logging for cleaner output
});

// Load models and attach to `db` object
const db = {
  sequelize, // Sequelize instance
  Sequelize, // Sequelize library reference
  HealthCheck: require("./healthcheck")(sequelize, Sequelize), // HealthCheck model
  File: require("./file")(sequelize, Sequelize),               // File model
};

module.exports = db;
