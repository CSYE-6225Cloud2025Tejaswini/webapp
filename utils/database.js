require("dotenv").config();
const { Sequelize } = require("sequelize");

async function createDatabaseIfNotExists() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const sequelize = new Sequelize("", DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: "mysql",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });

  try {
    await sequelize.authenticate();
    console.log("Connection established successfully.");
    const [results] = await sequelize.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${DB_NAME}'`
    );

    if (results.length === 0) {
      await sequelize.query(`CREATE DATABASE \`${DB_NAME}\``);
      console.log(`Database "${DB_NAME}" created successfully.`);
    } else {
      console.log(`Database "${DB_NAME}" already exists.`);
    }
  } catch (error) {
    console.error("Error in creating database:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

async function testConnection() {
  try {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    const testSequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: "mysql",
      logging: false,
    });

    await testSequelize.authenticate();
    await testSequelize.close();
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

module.exports = { 
  createDatabaseIfNotExists, 
  testConnection,
  initializeDatabase: createDatabaseIfNotExists,
  sequelize: new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "mysql",
      logging: false
    }
  )
};
