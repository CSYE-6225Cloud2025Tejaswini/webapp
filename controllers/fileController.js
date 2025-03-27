// controllers/fileController.js - modify your existing file
const File = require("../models/file");
const { uploadFileToS3, deletingFileFromS3 } = require("../utils/s3");
const { applyHeaders } = require("../utils/headers");
const logger = require("../utils/logger");

class FileController {
  static async uploadFile(req, res) {
    applyHeaders(res);
    logger.info("File upload request received");
    
    try {
      if (!req.file) {
        logger.warn("File upload request missing file attachment");
        return res.status(400).json({ error: "Bad Request" });
      }
      
      logger.info(`Processing file upload: ${req.file.originalname}, size: ${req.file.size} bytes`);
      const fileInformation = await uploadFileToS3(req.file.buffer, req.file.originalname);

      logger.info(`Creating database record for uploaded file: ${fileInformation.id}`);
      const newFile = await File.create({
        id: fileInformation.id,
        file_name: fileInformation.file_name,
        url: fileInformation.url,
        upload_date: fileInformation.upload_date,
      });

      logger.info(`File uploaded successfully: ${newFile.id}`);
      return res.status(201).json({
        file_name: newFile.file_name,
        id: newFile.id,
        url: newFile.url,
        upload_date: newFile.upload_date,
      });
    } catch (error) {
      logger.error(`Error uploading file: ${error.message}`, { error });
      return res.status(400).json({ error: "Bad Request" });
    }
  }

  static async getFile(req, res) {
    applyHeaders(res);
    const fileId = req.params.id;
    logger.info(`Get file request received for ID: ${fileId}`);
    
    try {
      const file = await File.findByPk(fileId);
      if (!file) {
        logger.warn(`File not found with ID: ${fileId}`);
        return res.status(404).json({ error: "Not Found" });
      }
      
      logger.info(`File found: ${file.id}`);
      return res.status(200).json({
        file_name: file.file_name,
        id: file.id,
        url: file.url,
        upload_date: file.upload_date,
      });
    } catch (error) {
      logger.error(`Error retrieving file: ${error.message}`, { error });
      return res.status(404).json({ error: "Not Found" });
    }
  }

  static async deletingFile(req, res) {
    applyHeaders(res);
    const fileId = req.params.id;
    logger.info(`Delete file request received for ID: ${fileId}`);
    
    try {
      const file = await File.findByPk(fileId);

      if (!file) {
        logger.warn(`File not found with ID: ${fileId}`);
        return res.status(404).json({ error: "Not Found" });
      }
      
      logger.info(`Deleting file from S3: ${file.url}`);
      await deletingFileFromS3(file.url);
      
      logger.info(`Deleting database record for file: ${file.id}`);
      await file.destroy();
      
      logger.info(`File deleted successfully: ${fileId}`);
      return res.status(204).end();
    } catch (error) {
      logger.error(`Error deleting file: ${error.message}`, { error });
      return res.status(404).json({ error: "Not Found" });
    }
  }
}

module.exports = FileController;