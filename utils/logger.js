const winston = require("winston");
const fs = require("fs");
const path = require("path");

// Create logs directory if it doesn't exist
const logDirectory = process.env.LOG_DIRECTORY || "logs";
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Configure the logger with file and console outputs
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "webapp" },
  transports: [
    // Write all logs to application.log
    new winston.transports.File({
      filename: path.join(logDirectory, "application.log"),
    }),
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
    }),
    // Write to console in development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Only add CloudWatch in production and development, not test
if (process.env.NODE_ENV !== "test") {
  try {
    // Dynamically import CloudWatch transport
    const { CloudWatchTransport } = require("winston-cloudwatch");

    logger.add(
      new CloudWatchTransport({
        logGroupName: "webapp-logs",
        logStreamName: `${process.env.NODE_ENV}-${Date.now()}`,
        awsRegion: process.env.AWS_REGION || "us-east-1",
        messageFormatter: (item) =>
          `${item.level}: ${item.message} ${JSON.stringify(item.meta)}`,
      })
    );

    logger.info("CloudWatch transport enabled");
  } catch (error) {
    logger.warn(
      "CloudWatch transport could not be initialized:",
      error.message
    );
    // Continue without CloudWatch - graceful degradation
  }
}

module.exports = logger;
