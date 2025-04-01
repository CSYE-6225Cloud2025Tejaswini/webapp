const winston = require("winston");
const fs = require("fs");
const path = require("path");

// ------------------------------------------
// Ensure logs directory exists
// ------------------------------------------
const logDirectory = process.env.LOG_DIRECTORY || "logs";
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// ------------------------------------------
// Configure Winston Logger
// ------------------------------------------
const logger = winston.createLogger({
  level: "info", // Minimum level to log (info and above)
  format: winston.format.combine(
    winston.format.timestamp(), // Add timestamps
    winston.format.json()       // Output logs in JSON format
  ),
  defaultMeta: { service: "webapp" }, // Include service name in all logs
  transports: [
    // General log file for all levels
    new winston.transports.File({
      filename: path.join(logDirectory, "application.log"),
    }),

    // Separate error log for level "error" only
    new winston.transports.File({
      filename: path.join(logDirectory, "error.log"),
      level: "error",
    }),

    // Console output for real-time visibility (in color for local dev)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Add colors to log level
        winston.format.simple()    // Simpler output for dev readability
      ),
    }),
  ],
});

// ------------------------------------------
//  Add CloudWatch Transport
// ------------------------------------------
if (process.env.NODE_ENV !== "test") {
  try {
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
    // Proceed without CloudWatch (fallback to local logging only)
  }
}

module.exports = logger;
