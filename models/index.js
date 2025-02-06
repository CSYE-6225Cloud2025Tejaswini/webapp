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
const config = require("../config/config.js");
const environment = process.env.NODE_ENV || "development";
const healthcheckModel = require("./healthcheck");

// Use database.js configuration approach
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.PORT,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      authPlugins: {
        mysql_clear_password: () => () =>
          Buffer.from(process.env.DB_PASSWORD + "\0"),
      },
    },
  }
);

const database = {
  sequelize,
  Sequelize,
  HealthStatus: healthcheckModel(sequelize, Sequelize),
};

module.exports = database;