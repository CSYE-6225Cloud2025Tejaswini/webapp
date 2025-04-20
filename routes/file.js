const express = require("express");
const router = express.Router();
const multer = require("multer");
const FileController = require("../controllers/fileController");

// -------------------------------
// Configure Multer for File Uploads
// -------------------------------
const storage = multer.memoryStorage(); // Store uploaded files in memory
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Max file size: 5MB
  },
});

// -------------------------------
// File Routes
// -------------------------------

// Upload a file (expects multipart/form-data with "Image" field)
router.post("/v1/file", upload.single("Image"), FileController.uploadFile);

// Retrieve a file's metadata by ID
router.get("/v1/file/:id", FileController.getFile);

// Delete a file by ID
router.delete("/v1/file/:id", FileController.deleteFile);

module.exports = router;
