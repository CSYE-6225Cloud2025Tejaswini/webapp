const { Sequelize } = require("sequelize");
const config = require("../config/config.js");
const env = process.env.NODE_ENV || "development";

if (!config[env]) {
  throw new Error(`Database configuration not found for environment: ${env}`);
}

const { username, password, database, host, port, dialect } = config[env];

const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect,
  logging: false,
});

const db = {
  sequelize,
  Sequelize,
  HealthCheck: require("./healthcheck")(sequelize, Sequelize),
  File: require("./file")(sequelize, Sequelize),
};

module.exports = db;
