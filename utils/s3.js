const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

// When running on EC2 with IAM role, no credentials are needed
// AWS SDK will automatically use the instance profile
AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET;

async function uploadFileToS3(fileBuffer, fileName) {
  try {
    if (!bucketName) {
      throw new Error("S3 bucket name is not defined in environment variables");
    }
    
    const fileId = uuidv4();
    const extension = fileName.split(".").pop();
    const s3Key = `${fileId}.${extension}`;
    
    console.log(`Uploading file to S3 bucket: ${bucketName}, key: ${s3Key}`);
    
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: `image/${extension}`, // Set appropriate content type
    };
    
    const uploadResult = await s3.upload(uploadParams).promise();
    console.log("File uploaded successfully:", uploadResult.Location);
    
    return {
      file_name: fileName,
      id: fileId,
      url: s3Key, // Store just the key, not the full URL
      upload_date: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

async function deletingFileFromS3(fileUrl) {
  try {
    if (!bucketName) {
      throw new Error("S3 bucket name is not defined in environment variables");
    }
    
    // Extract the key from the URL or use directly if it's just the key
    let key = fileUrl;
    if (fileUrl.includes("/")) {
      // If it's a full URL, extract the key
      const parts = fileUrl.split("/");
      key = parts[parts.length - 1];
    }
    
    console.log(`Deleting S3 object with key: ${key} from bucket: ${bucketName}`);
    
    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };
    
    await s3.deleteObject(deleteParams).promise();
    console.log("File deleted successfully from S3");
    
    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
}

module.exports = {
  uploadFile: uploadFileToS3,
  deletingFile: deletingFileFromS3,
  s3,
  bucketName,
};