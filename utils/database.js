// utils/database.js - modify your existing file
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const logger = require('./logger');
const metrics = require('./metrics');

dotenv.config();

// Create a Sequelize instance with logging
const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: (sql) => {
      logger.debug(`Executing SQL: ${sql}`);
    },
  }
);

// Modify Sequelize to track query performance
const originalQuery = sequelize.query;
sequelize.query = function(...args) {
  const startTime = Date.now();
  const result = originalQuery.apply(this, args);
  
  // Extract query type (SELECT, INSERT, etc.) from the first argument
  const queryType = typeof args[0] === 'string' 
    ? args[0].split(' ')[0].toLowerCase() 
    : 'unknown';
  
  // Track the query in metrics
  result.then(() => {
    metrics.timeDbQuery(queryType, startTime);
  }).catch(err => {
    logger.error(`Database query error: ${err.message}`);
  });
  
  return result;
};

// Function to connect to the database and test the connection
const connectToDatabase = async () => {
  try {
    logger.info('Attempting to connect to the database...');
    await sequelize.authenticate();
    logger.info('Connection has been established successfully.');
    await sequelize.sync();
    logger.info('Database models synchronized successfully.');
  } catch (error) {
    logger.error(`Unable to connect to the database: ${error.message}`, { error });
    throw error;
  }
};

module.exports = { sequelize, connectToDatabase };