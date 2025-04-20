const express = require("express");
const router = express.Router();

router.get("/cd", (req, res) => {
  res.status(200).json({ message: "CI/CD test passed." });
});

module.exports = router;