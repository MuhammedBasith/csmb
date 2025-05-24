import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { config } from '../config/config';
import AppError from '../utils/AppError';
import { s3Client } from '../config/aws';

export class S3Service {
  /**
   * Upload a file to S3
   * @param file File object from multer
   * @param folder Folder path in S3 bucket (e.g., 'images/founders/123')
   * @returns URL of the uploaded file
   */
  static async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      // Generate a unique file name
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = `${folder}/${fileName}`;

      // Read the file
      const fileContent = fs.readFileSync(file.path);

      // Set up the S3 upload parameters
      const params = {
        Bucket: config.aws.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: file.mimetype,
      };

      // Upload to S3 using multipart upload
      const upload = new Upload({
        client: s3Client,
        params
      });

      const uploadResult = await upload.done();

      // Delete the local file after successful upload
      fs.unlinkSync(file.path);

      // Return the URL of the uploaded file
      return `https://${config.aws.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new AppError('Failed to upload file to S3', 500);
    }
  }

  /**
   * Upload multiple files to S3
   * @param files Array of file objects from multer
   * @param folder Folder path in S3 bucket (e.g., 'images/founders/123')
   * @returns Array of URLs of the uploaded files
   */
  static async uploadMultipleFiles(files: Express.Multer.File[], folder: string): Promise<string[]> {
    try {
      // Upload each file and collect the promises
      const uploadPromises = files.map(file => this.uploadFile(file, folder));

      // Wait for all uploads to complete
      const fileUrls = await Promise.all(uploadPromises);

      return fileUrls;
    } catch (error) {
      console.error('Error uploading multiple files to S3:', error);
      throw new AppError('Failed to upload files to S3', 500);
    }
  }

  /**
   * Delete a file from S3
   * @param fileUrl URL of the file to delete
   */
  static async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the key from the URL
      const urlParts = new URL(fileUrl);
      const key = urlParts.pathname.substring(1); // Remove leading slash

      // Set up the S3 delete parameters
      const params = {
        Bucket: config.aws.bucketName,
        Key: key
      };

      // Delete from S3
      await s3Client.send(new DeleteObjectCommand(params));
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new AppError('Failed to delete file from S3', 500);
    }
  }

  /**
   * Generate a folder path for a specific founder's images
   * @param founderId ID of the founder
   * @param adminId ID of the admin uploading the image
   * @returns Folder path in S3 bucket
   */
  static getFounderImageFolder(founderId: string, adminId: string): string {
    return `images/founders/${founderId}/admin-${adminId}`;
  }
  
  /**
   * Generate a folder path for a specific post's images
   * @param founderId ID of the founder
   * @param adminId ID of the admin uploading the image
   * @param postId ID of the post (optional, for draft uploads)
   * @returns Folder path in S3 bucket
   */
  static getPostImageFolder(founderId: string, adminId: string, postId?: string): string {
    if (postId) {
      return `images/founders/${founderId}/admin-${adminId}/posts/${postId}`;
    }
    return `images/founders/${founderId}/admin-${adminId}/drafts`;
  }

  /**
   * Generate a folder path for reports
   * @param founderId ID of the founder (optional)
   * @returns Folder path in S3 bucket
   */
  static getReportFolder(founderId?: string): string {
    return founderId 
      ? `reports/founders/${founderId}` 
      : 'reports';
  }
}
