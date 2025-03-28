const express = require("express");
const router = express.Router();
const HealthcheckController = require("../controllers/healthcheckController");

router.get("/healthz", HealthcheckController.getHealthCheck);
router.all("/healthz", HealthcheckController.handleUnsupportedMethods);

module.exports = router;
