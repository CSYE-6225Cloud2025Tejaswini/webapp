const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });
const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET;

async function uploadFile(fileBuffer, fileName) {
  try {
    if (!bucketName) {
      throw new Error("S3 bucket name is not defined in environment variables");
    }
    const fileId = uuidv4();
    const extension = fileName.split(".").pop();
    const s3Key = `${fileId}.${extension}`;
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
    };
    const uploadResult = await s3.upload(uploadParams).promise();
    return {
      file_name: fileName,
      id: fileId,
      url: uploadResult.Location,
      upload_date: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

async function deletingFile(fileUrl) {
  try {
    if (!bucketName) {
      throw new Error("S3 bucket name is not defined in environment variables");
    }
    let key;
    if (fileUrl.includes("amazonaws.com")) {
      const urlObj = new URL(fileUrl);
      key = urlObj.pathname.slice(1);
    } else if (fileUrl.includes("/")) {
      const parts = fileUrl.split("/");
      key = parts[parts.length - 1];
    } else {
      key = fileUrl;
    }

    console.log(
      `Deleting S3 object with key: ${key} from bucket: ${bucketName}`
    );

    const deleteParams = {
      Bucket: bucketName,
      Key: key,
    };

    const result = await s3.deleteObject(deleteParams).promise();
    return {
      success: true,
      message: "File deleted successfully",
      result,
    };
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
}

module.exports = {
  uploadFile,
  deletingFile,
  s3,
  bucketName,
};
