const express = require("express");
const router = express.Router();
const HealthcheckController = require("../controllers/healthcheckController");

// Handle GET request to /healthz for service and DB health check
router.get("/healthz", HealthcheckController.getHealthCheck);

// Handle all other HTTP methods on /healthz with 405 Method Not Allowed
router.all("/healthz", HealthcheckController.handleUnsupportedMethods);

module.exports = router;
