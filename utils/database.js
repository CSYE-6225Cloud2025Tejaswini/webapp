require("dotenv").config(); // Load environment variables from .env

const { Sequelize } = require("sequelize");

// -------------------------------------------
// Create DB if it doesn't exist on the server
// -------------------------------------------
async function createDatabaseIfNotExists() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  // Connect to MySQL server without selecting a specific DB
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
    await sequelize.authenticate(); // Test connection
    console.log("Connection to MySQL server established successfully.");

    // Check if the target database exists
    const [results] = await sequelize.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${DB_NAME}'`
    );

    // Create the database if not found
    if (results.length === 0) {
      await sequelize.query(`CREATE DATABASE \`${DB_NAME}\``);
      console.log(`Database "${DB_NAME}" created successfully.`);
    } else {
      console.log(`Database "${DB_NAME}" already exists.`);
    }
  } catch (error) {
    console.error("Error creating database:", error);
    throw error;
  } finally {
    await sequelize.close(); // Close connection regardless of outcome
  }
}

// ---------------------------------------------------
// Utility to test connection to the specified database
// ---------------------------------------------------
async function testConnection() {
  try {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

    const testSequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: "mysql",
      logging: false,
    });

    await testSequelize.authenticate(); // Test DB connection
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
};
