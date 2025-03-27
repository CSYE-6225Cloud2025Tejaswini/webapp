// utils/s3.js - modify your existing file
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const logger = require('./logger');
const metrics = require('./metrics');

// Configuration remains the same
AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });
const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET;

async function uploadFileToS3(fileBuffer, fileName) {
  logger.info(`Starting upload to S3: ${fileName}`);
  const startTime = Date.now();
  
  try {
    if (!bucketName) {
      logger.error("S3 bucket name is not defined in environment variables");
      throw new Error("S3 bucket name is not defined in environment variables");
    }
    
    const fileId = uuidv4();
    const extension = fileName.split(".").pop();
    const s3Key = `${fileId}.${extension}`;
    
    logger.info(`Uploading file to S3 bucket: ${bucketName}, key: ${s3Key}`);
    
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: `image/${extension}`,
    };
    
    const uploadResult = await s3.upload(uploadParams).promise();
    logger.info(`File uploaded successfully: ${uploadResult.Location}`);
    
    const result = {
      file_name: fileName,
      id: fileId,
      url: s3Key,
      upload_date: new Date().toISOString(),
    };

    // Record metrics for the S3 upload operation
    metrics.timeS3Operation('upload', startTime);
    
    return result;
  } catch (error) {
    logger.error(`Error uploading file to S3: ${error.message}`, { error });
    throw error;
  }
}

async function deletingFileFromS3(fileUrl) {
  logger.info(`Starting deletion from S3: ${fileUrl}`);
  const startTime = Date.now();
  
  try {
    if (!bucketName) {
      logger.error("S3 bucket name is not defined in environment variables");
      throw new Error("S3 bucket name is not defined in environment variables");
    }
    
    // Extract the key from the URL or use directly if it's just the key
    let key = fileUrl;
    if (fileUrl.includes("/")) {
      const parts = fileUrl.split("/");
      key = parts[parts.length - 1];
    }
    
    logger.info(`Deleting S3 object with key: ${key} from bucket: ${bucketName}`);
    
    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };
    
    await s3.deleteObject(deleteParams).promise();
    logger.info("File deleted successfully from S3");
    
    // Record metrics for the S3 delete operation
    metrics.timeS3Operation('delete', startTime);
    
    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    logger.error(`Error deleting file from S3: ${error.message}`, { error });
    throw error;
  }
}

module.exports = {
  uploadFileToS3,
  deletingFileFromS3,
  s3,
  bucketName,
};