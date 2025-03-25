const express = require("express");
const router = express.Router();
const multer = require("multer");
const FileController = require("../controllers/fileController");

// Configure multer storage for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
});

// File upload route
router.post("/v1/file", upload.single("LOGO"), FileController.uploadFile);

// Get file by ID route
router.get("/v1/file/:id", FileController.getFile);

// Delete file by ID route
router.delete("/v1/file/:id", FileController.deletingFile);

module.exports = router;
