// utils/middleware.js
const logger = require('./logger');
const metrics = require('./metrics');

// Middleware to log requests and capture metrics
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const endpoint = req.path.replace(/\/[0-9a-f-]+/g, '/:id'); // Normalize paths with IDs
  
  // Log request
  logger.info(`${req.method} ${req.path} ${JSON.stringify(req.query)}`);
  
  // Count API call
  metrics.countApiCall(`${req.method.toLowerCase()}.${endpoint}`);
  
  // Capture original end function to monitor response
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Call the original end method
    originalEnd.apply(res, args);
    
    // Log response
    const responseTime = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} completed with status ${res.statusCode} in ${responseTime}ms`);
    
    // Record API timing
    metrics.timeApiCall(`${req.method.toLowerCase()}.${endpoint}`, startTime);
  };
  
  next();
};

// Error handling middleware with logging
const errorHandler = (err, req, res, next) => {
  logger.error(`Error processing ${req.method} ${req.path}: ${err.message}`, { 
    error: err,
    stack: err.stack
  });
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
};

module.exports = {
  requestLogger,
  errorHandler
};