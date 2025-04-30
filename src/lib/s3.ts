import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Log AWS configuration
console.log("AWS Configuration:");
console.log(" - Region:", process.env.AWS_REGION || "NOT SET");
console.log(" - Bucket:", process.env.AWS_BUCKET_NAME || "NOT SET");
console.log(" - Access Key:", process.env.AWS_ACCESS_KEY_ID ? "Set (starts with " + process.env.AWS_ACCESS_KEY_ID.substring(0, 4) + "...)" : "NOT SET");
console.log(" - Secret Key:", process.env.AWS_SECRET_ACCESS_KEY ? "Set (length: " + process.env.AWS_SECRET_ACCESS_KEY.length + ")" : "NOT SET");

// Verify required environment variables
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
  console.error("ERROR: Missing required AWS environment variables");
}

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_BUCKET_NAME || '';

/**
 * Generate a presigned URL for uploading a file
 */
export async function generateUploadUrl(key: string, contentType: string) {
  console.log("Generating upload URL for:", key, "content type:", contentType);
  if (!bucketName) {
    console.error("ERROR: AWS_BUCKET_NAME is not set");
    throw new Error("S3 bucket name is not configured");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log("Generated upload URL successfully, length:", signedUrl.length);
    return signedUrl;
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw error;
  }
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function generateDownloadUrl(key: string) {
  console.log("Generating download URL for:", JSON.stringify(key));
  
  if (!key || key.trim() === "") {
    console.error("ERROR: Empty key provided to generateDownloadUrl");
    throw new Error("Cannot generate download URL for empty key");
  }
  
  if (!bucketName) {
    console.error("ERROR: AWS_BUCKET_NAME is not set");
    throw new Error("S3 bucket name is not configured");
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    console.log(`GetObjectCommand created for bucket ${bucketName} and key ${key}`);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log("Generated download URL successfully:", signedUrl.substring(0, 50) + "...");
    return signedUrl;
  } catch (error) {
    console.error('Error generating download URL:', error);
    throw error;
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string) {
  console.log("Deleting file from S3:", key);
  if (!bucketName) {
    console.error("ERROR: AWS_BUCKET_NAME is not set");
    throw new Error("S3 bucket name is not configured");
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    await s3Client.send(command);
    console.log("File deleted successfully from S3");
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
}

export { s3Client }; 