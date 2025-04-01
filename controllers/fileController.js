const { File } = require("../models");
const { uploadFile, deleteFile } = require("../utils/s3");
const { setCommonHeaders } = require("../utils/headers");
const logger = require("../utils/logger");
const metrics = require("../utils/metrics");

class FileController {
  // Upload a file to S3 and store metadata in the database
  static async uploadFile(req, res) {
    const startTime = metrics.startApiTimer("uploadFile");
    setCommonHeaders(res);

    try {
      metrics.countApiCall("uploadFile");
      logger.info("File upload request received");

      // Ensure file is present in the request
      if (!req.file) {
        logger.warn("File upload attempted without file");
        metrics.endApiTimer("uploadFile", startTime);
        return res.status(400).json({ error: "Bad Request" });
      }

      // Upload file to S3
      const fileInfo = await uploadFile(req.file.buffer, req.file.originalname);

      // Store file metadata in the database
      const dbStartTime = process.hrtime();
      const newFile = await File.create({
        id: fileInfo.id,
        file_name: fileInfo.file_name,
        url: fileInfo.url,
        upload_date: fileInfo.upload_date,
      });
      const dbDiff = process.hrtime(dbStartTime);
      const dbTimeMs = dbDiff[0] * 1000 + dbDiff[1] / 1000000;
      metrics.recordDbQueryTime("createFile", dbTimeMs);

      // Log success and return file metadata to client
      const responseTime = metrics.endApiTimer("uploadFile", startTime);
      logger.info(
        `File uploaded successfully: ${fileInfo.file_name}, id: ${fileInfo.id}, response time: ${responseTime}ms`
      );

      return res.status(201).json({
        file_name: newFile.file_name,
        id: newFile.id,
        url: newFile.url,
        upload_date: newFile.upload_date,
      });
    } catch (error) {
      // Log error and return bad request
      logger.error(`Error uploading file: ${error.message}`, {
        error: error.stack,
      });
      metrics.endApiTimer("uploadFile", startTime);
      return res.status(400).json({ error: "Bad Request" });
    }
  }
  // Retrieve metadata for a specific file by ID
  static async getFile(req, res) {
    const startTime = metrics.startApiTimer("getFile");
    setCommonHeaders(res);

    try {
      metrics.countApiCall("getFile");
      const fileId = req.params.id;
      logger.info(`Get file request received for id: ${fileId}`);

      /// Look up file metadata in the database
      const dbStartTime = process.hrtime();
      const file = await File.findByPk(fileId);
      const dbDiff = process.hrtime(dbStartTime);
      const dbTimeMs = dbDiff[0] * 1000 + dbDiff[1] / 1000000;
      metrics.recordDbQueryTime("findFile", dbTimeMs);

      if (!file) {
        logger.warn(`File not found with id: ${fileId}`);
        metrics.endApiTimer("getFile", startTime);
        return res.status(404).json({ error: "Not Found" });
      }

      // Log success and return file metadata
      const responseTime = metrics.endApiTimer("getFile", startTime);
      logger.info(
        `File retrieved successfully: ${file.file_name}, response time: ${responseTime}ms`
      );

      return res.status(200).json({
        file_name: file.file_name,
        id: file.id,
        url: file.url,
        upload_date: file.upload_date,
      });
    } catch (error) {
      // Log error and return not found
      logger.error(`Error retrieving file: ${error.message}`, {
        error: error.stack,
      });
      metrics.endApiTimer("getFile", startTime);
      return res.status(404).json({ error: "Not Found" });
    }
  }
// Delete a file from both S3 and the database
  static async deleteFile(req, res) {
    const startTime = metrics.startApiTimer("deleteFile");
    setCommonHeaders(res);

    try {
      metrics.countApiCall("deleteFile");
      const fileId = req.params.id;
      logger.info(`Delete file request received for id: ${fileId}`);

      // Find file metadata in database
      const dbStartTime = process.hrtime();
      const file = await File.findByPk(fileId);
      const dbDiff = process.hrtime(dbStartTime);
      const dbTimeMs = dbDiff[0] * 1000 + dbDiff[1] / 1000000;
      metrics.recordDbQueryTime("findFileForDelete", dbTimeMs);

      if (!file) {
        logger.warn(`File not found for deletion with id: ${fileId}`);
        metrics.endApiTimer("deleteFile", startTime);
        return res.status(404).json({ error: "Not Found" });
      }

      // Delete file from S3
      await deleteFile(file.url);

      // Delete file metadata from database
      const deleteDbStartTime = process.hrtime();
      await file.destroy();
      const deleteDbDiff = process.hrtime(deleteDbStartTime);
      const deleteDbTimeMs = deleteDbDiff[0] * 1000 + deleteDbDiff[1] / 1000000;
      metrics.recordDbQueryTime("deleteFile", deleteDbTimeMs);

      // Log success and send no content response
      const responseTime = metrics.endApiTimer("deleteFile", startTime);
      logger.info(
        `File deleted successfully: ${file.file_name}, id: ${fileId}, response time: ${responseTime}ms`
      );

      return res.status(204).end();
    } catch (error) {
      // Log error and return not found
      logger.error(`Error deleting file: ${error.message}`, {
        error: error.stack,
      });
      metrics.endApiTimer("deleteFile", startTime);
      return res.status(404).json({ error: "Not Found" });
    }
  }
}

module.exports = FileController;
