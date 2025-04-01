const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const metrics = require("./metrics");
const logger = require("./logger");

// Configure AWS SDK with region (default to us-east-1 if not set)
AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });

// Initialize AWS S3 client
const s3 = new AWS.S3();

// Get bucket name from environment variables
const bucketName = process.env.S3_BUCKET;

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file content as a buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<Object>} - Object containing file metadata
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

    // Extract file extension
    const extension = fileName.split(".").pop();

    // Define the S3 key (e.g., "uuid.jpg")
    const s3Key = `${fileId}.${extension}`;

    // Upload parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
    };

    // Perform upload
    const uploadResult = await s3.upload(uploadParams).promise();

    const result = {
      file_name: fileName,
      id: fileId,
      url: uploadResult.Location,
      upload_date: new Date().toISOString(),
    };

    // Record timing metric
    const diff = process.hrtime(startTime);
    const timeMs = diff[0] * 1000 + diff[1] / 1e6;
    metrics.recordS3OperationTime("upload", timeMs);

    logger.info(`File uploaded successfully: ${fileName}, id: ${fileId}`);
    return result;
  } catch (error) {
    // Log and track error metrics
    logger.error(`Error uploading file to S3: ${error.message}`, { error });
    const diff = process.hrtime(startTime);
    const timeMs = diff[0] * 1000 + diff[1] / 1e6;
    metrics.recordS3OperationTime("upload-error", timeMs);
    throw error;
  }
}

/**
 * Delete a file from S3
 * @param {string} fileUrl - The full S3 file URL or key
 * @returns {Promise<Object>} - Deletion status and result
 */
async function deleteFile(fileUrl) {
  const startTime = process.hrtime();

  try {
    if (!bucketName) {
      throw new Error("S3 bucket name is not defined in environment variables");
    }

    // Extract the key from a full URL or path
    let key;
    if (fileUrl.includes("amazonaws.com")) {
      const urlObj = new URL(fileUrl);
      key = urlObj.pathname.slice(1); // Remove leading "/"
    } else if (fileUrl.includes("/")) {
      key = fileUrl.split("/").pop(); // Take last segment as key
    } else {
      key = fileUrl; // Assume already a key
    }

    logger.info(`Deleting S3 object with key: ${key} from bucket: ${bucketName}`);

    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    const result = await s3.deleteObject(deleteParams).promise();

    // Record timing metric
    const diff = process.hrtime(startTime);
    const timeMs = diff[0] * 1000 + diff[1] / 1e6;
    metrics.recordS3OperationTime("delete", timeMs);

    logger.info(`File deleted successfully: ${key}`);
    return {
      success: true,
      message: "File deleted successfully",
      result,
    };
  } catch (error) {
    // Log and track error metrics
    logger.error(`Error deleting file from S3: ${error.message}`, { error });
    const diff = process.hrtime(startTime);
    const timeMs = diff[0] * 1000 + diff[1] / 1e6;
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
