import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';
import { ActivityLogService } from '../services/activityLogService';
import { S3Service } from '../services/s3Service';

/**
 * Upload images
 * POST /uploads/images
 */
export const uploadImages = catchAsync(async (req: Request, res: Response) => {
  // Check if files were uploaded
  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    throw new AppError('No images uploaded', 400);
  }

  // Get the uploaded files
  const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  
  // Get founderId and optional postId from query or body
  const founderId = req.query.founderId as string || req.body.founderId;
  const postId = req.query.postId as string || req.body.postId;
  
  if (!founderId) {
    throw new AppError('Founder ID is required for image uploads', 400);
  }
  
  // Generate the folder path for this founder's images
  // If postId is provided, organize images by post, otherwise use the general folder
  const folder = postId
    ? S3Service.getPostImageFolder(founderId, req.userId!, postId)
    : S3Service.getFounderImageFolder(founderId, req.userId!);
  
  // Upload files to S3
  const imageUrls = await S3Service.uploadMultipleFiles(files, folder);

  // Log the activity
  await ActivityLogService.logActivity(
    req.userId!,
    req.userRole!,
    'Uploaded Images',
    {
      count: imageUrls.length,
      founderId,
      timestamp: new Date()
    }
  );

  res.status(200).json({
    success: true,
    message: 'Images uploaded successfully',
    imageUrls
  });
});
