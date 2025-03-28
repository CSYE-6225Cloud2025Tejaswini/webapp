const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const metrics = require("./metrics");
const logger = require("./logger");

// Configure AWS SDK
AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });

// Initialize S3 client
const s3 = new AWS.S3();

// Get S3 bucket name from environment variables
const bucketName = process.env.S3_BUCKET;

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file content as a buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<Object>} - Object containing file info
 */
async function uploadFile(fileBuffer, fileName) {
  const startTime = process.hrtime();
  try {
    if (!bucketName) {
      throw new Error("S3 bucket name is not defined in environment variables");
    }

    logger.info(`Starting upload of file: ${fileName}`);

    // Generate a unique ID for the file
    const fileId = uuidv4();

    // Get file extension
    const extension = fileName.split(".").pop();

    // Create the S3 key (path within the bucket)
    const s3Key = `${fileId}.${extension}`;

    // Set up the S3 upload parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
    };

    // Upload file to S3
    const uploadResult = await s3.upload(uploadParams).promise();

    const result = {
      file_name: fileName,
      id: fileId,
      url: uploadResult.Location,
      upload_date: new Date().toISOString(),
    };

    const diff = process.hrtime(startTime);
    const timeMs = diff[0] * 1000 + diff[1] / 1000000;
    metrics.recordS3OperationTime("upload", timeMs);

    logger.info(`File uploaded successfully: ${fileName}, id: ${fileId}`);

    return result;
  } catch (error) {
    logger.error(`Error uploading file to S3: ${error.message}`, { error });
    const diff = process.hrtime(startTime);
    const timeMs = diff[0] * 1000 + diff[1] / 1000000;
    metrics.recordS3OperationTime("upload-error", timeMs);
    throw error;
  }
}

/**
 * Delete a file from S3
 * @param {string} fileUrl - The full URL of the file to delete
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteFile(fileUrl) {
  const startTime = process.hrtime();
  try {
    if (!bucketName) {
      throw new Error("S3 bucket name is not defined in environment variables");
    }

    // Parse the URL to extract the key
    let key;
    if (fileUrl.includes("amazonaws.com")) {
      // Full S3 URL format: https://bucket-name.s3.region.amazonaws.com/key
      // Or: https://bucket-name.s3.amazonaws.com/key
      const urlObj = new URL(fileUrl);
      key = urlObj.pathname.slice(1); // Remove leading slash
    } else if (fileUrl.includes("/")) {
      // URL might be relative path or just the key part with slashes
      const parts = fileUrl.split("/");
      key = parts[parts.length - 1];
    } else {
      // The URL might already be just the key
      key = fileUrl;
    }

    logger.info(
      `Deleting S3 object with key: ${key} from bucket: ${bucketName}`
    );

    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    const result = await s3.deleteObject(deleteParams).promise();

    const diff = process.hrtime(startTime);
    const timeMs = diff[0] * 1000 + diff[1] / 1000000;
    metrics.recordS3OperationTime("delete", timeMs);

    logger.info(`File deleted successfully: ${key}`);

    return {
      success: true,
      message: "File deleted successfully",
      result,
    };
  } catch (error) {
    logger.error(`Error deleting file from S3: ${error.message}`, { error });
    const diff = process.hrtime(startTime);
    const timeMs = diff[0] * 1000 + diff[1] / 1000000;
    metrics.recordS3OperationTime("delete-error", timeMs);
    throw error;
  }
}

module.exports = {
  uploadFile,
  deleteFile,
  s3,
  bucketName,
};
