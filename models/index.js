// const { Sequelize } = require("sequelize");
// const config = require("../config/config.js");
// const environment = process.env.NODE_ENV || "development";
 
// const sequelizeInstance = new Sequelize(config[environment].url, config[environment]);
 
// const database = {
//   sequelizeInstance,
//   Sequelize,
//   HealthStatus: require("./healthcheck")(sequelizeInstance, Sequelize),
// };
 
// module.exports = database;

const { Sequelize } = require("sequelize");
require("dotenv").config();

// Load from environment variables (set by EC2 user data)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      ssl: false // Adjust if your RDS requires SSL
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const database = {
  sequelize,
  Sequelize,
  HealthStatus: require("./healthcheck")(sequelize, Sequelize),
  File: require("./file")(sequelize, Sequelize),
};

module.exports = database;