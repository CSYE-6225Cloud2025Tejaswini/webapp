const winston = require("winston");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Create logs directory if it doesn't exist
const logDirectory = process.env.LOG_DIRECTORY || "logs";
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// Get instance ID for CloudWatch stream name
const getInstanceId = () => {
  try {
    if (process.env.AWS_EXECUTION_ENV) {
      // Running on EC2, try to get instance ID from metadata
      return os.hostname();
    }
    // Not running on EC2, use a placeholder
    return `local-${os.hostname()}`;
  } catch (error) {
    return `unknown-${Date.now()}`;
  }
};

// Configure the logger with file and console outputs
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: "webapp",
    instance: getInstanceId(),
    environment: process.env.NODE_ENV || "development"
  },
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

// Only add CloudWatch in production and when AWS_CLOUDWATCH_ENABLED is true
if (process.env.NODE_ENV !== "test" && process.env.AWS_CLOUDWATCH_ENABLED === "true") {
  try {
    // Dynamically import CloudWatch transport
    const { CloudWatchTransport } = require("winston-cloudwatch");

    logger.add(
      new CloudWatchTransport({
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP || "webapp-logs",
        logStreamName: `${getInstanceId()}-${Date.now()}`,
        awsRegion: process.env.AWS_REGION || "us-east-1",
        messageFormatter: (item) => {
          const { level, message, ...meta } = item;
          return `[${level.toUpperCase()}] ${message} ${JSON.stringify(meta)}`;
        },
        jsonMessage: true,
        retentionInDays: 7
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