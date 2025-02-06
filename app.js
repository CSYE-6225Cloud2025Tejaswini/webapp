require("dotenv").config();
const express = require("express");
//const { sequelize } = require("./models");
const healthRoutes = require("./routes/healthcheck");
//const { initializeDatabase } = require("./utils/database");
const { applyHeaders } = require("./utils/headers");
 
const app = express();
const PORT = process.env.PORT || 8080;
 
// Middleware to handle JSON payloads with error handling
app.use(
  express.json({
    verify: (req, res, buf) => {
      if (buf.length) {
        try {
          JSON.parse(buf);
        } catch {
          res.status(400).send("Invalid JSON");
          throw new Error("Invalid JSON payload");
        }
      }
    },
  })
);
 
// Mount health check routes
app.use("/", healthRoutes);
 
// Handle unknown routes
app.use((req, res) => {
  applyHeaders(res);
  res.status(404).send("Not Found");
});
 
// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).send("Bad Request");
  }
  console.error("Internal Server Error:", err.stack);
  res.status(500).send("Internal Server Error");
});
 
module.exports = app;