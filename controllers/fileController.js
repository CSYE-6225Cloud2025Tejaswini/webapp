const File = require("../models/file");
const { uploadFileToS3, deletingFileFromS3 } = require("../utils/s3");
const { applyHeaders } = require("../utils/headers");

class FileController {
  static async uploadFile(req, res) {
    applyHeaders(res);
    try {

      if (!req.file) {
        return res.status(400).json({ error: "Bad Request" });
      }
      const fileInformation = await uploadFileToS3(req.file.buffer, req.file.originalname);

      const newFile = await File.create({
        id: fileInformation.id,
        file_name: fileInformation.file_name,
        url: fileInformation.url,
        upload_date: fileInformation.upload_date,
      });

      return res.status(201).json({
        file_name: newFile.file_name,
        id: newFile.id,
        url: newFile.url,
        upload_date: newFile.upload_date,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      return res.status(400).json({ error: "Bad Request" });
    }
  }

  static async getFile(req, res) {
    applyHeaders(res);
    try {
      const fileId = req.params.id;
      const file = await File.findByPk(fileId);
      if (!file) {
        return res.status(404).json({ error: "Not Found" });
      }
      return res.status(200).json({
        file_name: file.file_name,
        id: file.id,
        url: file.url,
        upload_date: file.upload_date,
      });
    } catch (error) {
      console.error("Error retrieving file:", error);
      return res.status(404).json({ error: "Not Found" });
    }
  }

  static async deletingFile(req, res) {
    applyHeaders(res);
    try {
      const fileId = req.params.id;
      const file = await File.findByPk(fileId);

      if (!file) {
        return res.status(404).json({ error: "Not Found" });
      }
      await deletingFileFromS3(file.url);
      await file.destroy();
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting file:", error);
      return res.status(404).json({ error: "Not Found" });
    }
  }
}

module.exports = FileController;

 