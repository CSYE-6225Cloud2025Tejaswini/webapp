const express = require("express");
const router = express.Router();

router.get("/cicd", (req, res) => {
  res.status(200).json({ message: "CI/CD test passed." });
});

module.exports = router;