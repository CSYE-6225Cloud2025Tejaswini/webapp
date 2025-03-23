const { Sequelize } = require("sequelize");
require("dotenv").config();

// Function to create database if it doesn't exist
// Note: When using RDS, we might not have CREATE DATABASE privileges
// so this function might need to be adjusted or skipped
async function createDatabaseIfNotExists() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  
  // For RDS connections, we should handle potential connectivity issues
  try {
    // Connect to the MySQL server without specifying a database
    const sequelize = new Sequelize("", DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT || 3306,
      dialect: "mysql",
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: {
        connectTimeout: 60000 // Increase timeout for RDS connections
      }
    });

    await sequelize.authenticate();
    console.log("Initial connection established successfully.");
    
    // Check if database exists - if not, try to create it
    // Note: In RDS, you might not have permissions to do this
    try {
      const [results] = await sequelize.query(
        `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${DB_NAME}'`
      );

      if (results.length === 0) {
        try {
          await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
          console.log(`Database "${DB_NAME}" created successfully.`);
        } catch (createError) {
          console.warn(`Unable to create database "${DB_NAME}". It may need to be created manually: ${createError.message}`);
          // For RDS, we might need to accept that the DB should be pre-created
        }
      } else {
        console.log(`Database "${DB_NAME}" already exists.`);
      }
    } catch (queryError) {
      console.warn(`Unable to check if database exists: ${queryError.message}`);
    }
    
    await sequelize.close();
  } catch (error) {
    console.error("Initial database connection failed:", error);
    throw error;
  }
}

// Function to test the connection to the specific database
async function testConnection() {
  try {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    const testSequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT || 3306,
      dialect: "mysql",
      logging: false,
      dialectOptions: {
        connectTimeout: 60000
      }
    });

    await testSequelize.authenticate();
    console.log("Database connection test successful.");
    await testSequelize.close();
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error.message);
    return false;
  }
}

// Initialize database and models
async function initializeDatabase() {
  try {
    // First check/create the database
    await createDatabaseIfNotExists();
    
    // Then test the connection to the specific database
    const connected = await testConnection();
    
    if (!connected) {
      console.error("Could not establish connection to the database.");
      throw new Error("Database connection failed.");
    }
    
    console.log("Database initialization completed successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

// Create the main sequelize instance that will be used by the application
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 60000
    }
  }
);

module.exports = { 
  createDatabaseIfNotExists, 
  testConnection,
  initializeDatabase,
  sequelize
};