const express = require("express");
const router = express.Router();
const HealthStatusController = require("../controllers/healthcheckController");
 
router.get("/healthz", HealthStatusController.fetchHealthStatus);
router.all("/healthz", HealthStatusController.unsupportedMethods);
 
module.exports = router;