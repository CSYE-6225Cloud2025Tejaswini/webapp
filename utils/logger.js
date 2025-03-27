// utils/logger.js
const winston = require('winston');
const { createLogger, format, transports } = winston;

// Create a custom format that includes timestamp and colorizes output
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

// Create the logger
const logger = createLogger({
  level: 'info',
  format: customFormat,
  transports: [
    // Log to console
    new transports.Console(),
    // Log to file for CloudWatch to pick up
    new transports.File({ filename: '/var/log/webapp/application.log' })
  ]
});

module.exports = logger;