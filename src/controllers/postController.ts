import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { PostService } from '../services/postService';
import AppError from '../utils/AppError';
import { ActivityLogService } from '../services/activityLogService';
import { AssignmentService } from '../services/assignmentService';
import { FounderService } from '../services/founderService';

/**
 * Get posts with optional filtering
 * GET /posts
 */
export const getPosts = catchAsync(async (req: Request, res: Response) => {
  const { 
    founderId, 
    adminId, 
    status, 
    startDate, 
    endDate,
    limit = 20,
    offset = 0
  } = req.query;

  const filters: any = {};
  
  // Handle different user roles
  if (req.userRole === 'admin') {
    // If founderId is provided, check if admin is assigned to this founder
    if (founderId) {
      const isAssigned = await AssignmentService.isAdminAssignedToFounder(
        req.userId!,
        founderId as string
      );
      
      if (!isAssigned) {
        throw new AppError('You are not assigned to this founder', 403);
      }
      filters.founderId = founderId;
    }
    
    // For admins, only show posts they created or for founders assigned to them
    if (adminId) {
      // Admin can only filter by their own adminId
      if (adminId !== req.userId) {
        throw new AppError('You can only filter by your own admin ID', 403);
      }
      filters.adminId = adminId;
    } else {
      // If no adminId provided, default to current admin
      filters.adminId = req.userId;
    }
  } else if (req.userRole === 'founder') {
    // Founders can only see their own posts
    const founder = await FounderService.getFounderByUserId(req.userId!);
    
    if (!founder) {
      throw new AppError('Founder profile not found', 404);
    }
    
    // Set filter to only show posts for this founder
    filters.founderId = founder.userId;
    
    // If specific founderId was requested, verify it matches the logged-in founder
    if (founderId && founder.userId.toString() !== founderId) {
      throw new AppError('You can only view your own posts', 403);
    }
  } else if (req.userRole === 'super-admin') {
    // Super admins can see all posts or filter by specific founder/admin
    if (founderId) filters.founderId = founderId;
    if (adminId) filters.adminId = adminId;
  }
  
  // Apply status filter if provided
  if (status) {
    filters.status = status;
  }
  
  // Apply date filters if provided - these will be handled in the service
  if (startDate) {
    filters.startDate = startDate;
  }
  
  if (endDate) {
    filters.endDate = endDate;
  }

  // Get posts with applied filters
  const { posts, total } = await PostService.getPosts(
    filters,
    Number(limit),
    Number(offset)
  );

  res.status(200).json({
    success: true,
    posts,
    total,
    limit: Number(limit),
    offset: Number(offset)
  });
});

/**
 * Create a new post
 * POST /posts
 */
export const createPost = catchAsync(async (req: Request, res: Response) => {
  const { founderId, caption, images, scheduledDate } = req.body;
  
  // Check if admin is assigned to this founder
  if (req.userRole === 'admin') {
    const isAssigned = await AssignmentService.isAdminAssignedToFounder(
      req.userId!,
      founderId
    );
    
    if (!isAssigned) {
      throw new AppError('You are not assigned to this founder', 403);
    }
  }
  
  // Determine initial status based on scheduled date
  const status = scheduledDate ? 'scheduled' : 'pending';
  
  // Create the post
  const post = await PostService.createPost({
    founderId,
    adminId: req.userId!,
    caption,
    images: images || [], // Default to empty array if not provided
    scheduledDate,
    status
  });
  
  console.log(`Post created with ID: ${post._id}, status: ${status}${scheduledDate ? ', scheduled for: ' + new Date(scheduledDate).toISOString() : ''}`);

  
  // Log the activity
  await ActivityLogService.logActivity(
    req.userId!,
    req.userRole!,
    'Created Post',
    {
      postId: post.id,
      founderId,
      timestamp: new Date()
    }
  );
  
  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    post
  });
});

/**
 * Get a specific post by ID
 * GET /posts/:id
 */
export const getPostById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const post = await PostService.getPostById(id);
  
  if (!post) {
    throw new AppError('Post not found', 404);
  }
  
  // Check if admin is authorized to view this post
  if (req.userRole === 'admin') {
    // Admin can view if they created the post or are assigned to the founder
    const isCreator = post.adminId.toString() === req.userId;
    
    if (!isCreator) {
      const isAssigned = await AssignmentService.isAdminAssignedToFounder(
        req.userId!,
        post.founderId.toString()
      );
      
      if (!isAssigned) {
        throw new AppError('You are not authorized to view this post', 403);
      }
    }
  }
  
  res.status(200).json({
    success: true,
    post
  });
});

/**
 * Update an existing post
 * PUT /posts/:id
 */
export const updatePost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  
  // Get the post to check permissions
  const existingPost = await PostService.getPostById(id);
  console.log(`Existing post: ${JSON.stringify(existingPost)}`);
  
  
  if (!existingPost) {
    throw new AppError('Post not found', 404);
  }
  
  // Check if admin is authorized to update this post
  if (req.userRole === 'admin') {
    // Admin can only update posts they created
    if (existingPost.adminId.toString() !== req.userId) {
      throw new AppError('You are not authorized to update this post', 403);
    }
    
    // Admins can't change status to approved or rejected
    if (updateData.status && ['approved', 'rejected'].includes(updateData.status)) {
      throw new AppError('Admins cannot approve or reject posts', 403);
    }
  }
  
  // If scheduledDate is provided, set status to scheduled
  if (updateData.scheduledDate && updateData.status !== 'rejected') {
    updateData.status = 'scheduled';
  }
  
  // Update the post
  const updatedPost = await PostService.updatePost(id, updateData);
  
  // Log the activity
  await ActivityLogService.logActivity(
    req.userId!,
    req.userRole!,
    'Updated Post',
    {
      postId: id,
      founderId: existingPost.founderId,
      timestamp: new Date()
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'Post updated successfully',
    post: updatedPost
  });
});

/**
 * Delete a post
 * DELETE /posts/:id
 */
export const deletePost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Get the post to check permissions
  const existingPost = await PostService.getPostById(id);
  
  if (!existingPost) {
    throw new AppError('Post not found', 404);
  }
  
  // Check if admin is authorized to delete this post
  if (req.userRole === 'admin') {
    // Admin can only delete posts they created
    if (existingPost.adminId.toString() !== req.userId) {
      throw new AppError('You are not authorized to delete this post', 403);
    }
  }
  
  // Delete the post
  await PostService.deletePost(id);
  
  // Log the activity
  await ActivityLogService.logActivity(
    req.userId!,
    req.userRole!,
    'Deleted Post',
    {
      postId: id,
      founderId: existingPost.founderId,
      timestamp: new Date()
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'Post deleted successfully'
  });
});

/**
 * Update post status (approve/reject/posted)
 * PATCH /posts/:id/status
 */
export const updatePostStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, feedback } = req.body;
  
  // Validate status
  if (!['approved', 'rejected', 'posted'].includes(status)) {
    throw new AppError('Invalid status. Must be approved, rejected, or posted', 400);
  }
  
  // If status is rejected, feedback is required
  if (status === 'rejected' && !feedback) {
    throw new AppError('Feedback is required when rejecting a post', 400);
  }
  
  // Get the post to check permissions
  const existingPost = await PostService.getPostById(id);
  
  if (!existingPost) {
    throw new AppError('Post not found', 404);
  }
  
  // Check if founder is authorized to update this post's status
  if (req.userRole === 'founder') {
    // Founder can only update posts assigned to them
    const founder = await FounderService.getFounderByUserId(req.userId!);
    
    if (!founder) {
      throw new AppError('Founder profile not found', 404);
    }
    
    // Check if this post belongs to the founder
    if (existingPost.founderId.toString() !== founder.userId.toString()) {
      throw new AppError('You are not authorized to update this post', 403);
    }
  } else if (req.userRole !== 'super-admin') {
    // Only founders and super-admins can update post status
    throw new AppError('Only founders can approve or reject posts', 403);
  }
  
  // Update the post status and feedback if provided
  const updateData: any = { status };
  if (feedback) {
    updateData.feedback = feedback;
  }
  
  const updatedPost = await PostService.updatePost(id, updateData);
  
  // Log the activity
  await ActivityLogService.logActivity(
    req.userId!,
    req.userRole!,
    `Post ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    {
      postId: id,
      founderId: existingPost.founderId,
      timestamp: new Date()
    }
  );
  
  res.status(200).json({
    success: true,
    message: `Post ${status} successfully`,
    post: updatedPost
  });
});

/**
 * Add feedback to a post
 * POST /posts/:id/feedback
 */
export const addPostFeedback = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { feedback } = req.body;
  
  if (!feedback || typeof feedback !== 'string' || feedback.trim() === '') {
    throw new AppError('Valid feedback is required', 400);
  }
  
  // Get the post to check permissions
  const existingPost = await PostService.getPostById(id);
  
  if (!existingPost) {
    throw new AppError('Post not found', 404);
  }
  
  // Check if founder is authorized to add feedback to this post
  if (req.userRole === 'founder') {
    // Founder can only add feedback to posts assigned to them
    const founder = await FounderService.getFounderByUserId(req.userId!);
    
    if (!founder) {
      throw new AppError('Founder profile not found', 404);
    }
    
    // Check if this post belongs to the founder
    if (existingPost.founderId.toString() !== founder.userId.toString()) {
      throw new AppError('You are not authorized to add feedback to this post', 403);
    }
  }
  
  // Update the post with the feedback
  const updatedPost = await PostService.updatePost(id, { feedback });
  
  // Log the activity
  await ActivityLogService.logActivity(
    req.userId!,
    req.userRole!,
    'Added Feedback to Post',
    {
      postId: id,
      founderId: existingPost.founderId,
      timestamp: new Date()
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'Feedback added successfully',
    post: updatedPost
  });
});

/**
 * Update post images
 * PATCH /posts/:id/images
 */
export const updatePostImages = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { images } = req.body;
  
  if (!images || !Array.isArray(images)) {
    throw new AppError('Images must be provided as an array', 400);
  }
  
  // Limit the number of images
  if (images.length > 10) {
    throw new AppError('Maximum 10 images allowed per post', 400);
  }
  
  // Get the post to check permissions
  const existingPost = await PostService.getPostById(id);
  
  if (!existingPost) {
    throw new AppError('Post not found', 404);
  }
  
  // Check permissions based on role
  if (req.userRole === 'founder') {
    // Founder can only update images for posts assigned to them
    const founder = await FounderService.getFounderByUserId(req.userId!);
    
    if (!founder) {
      throw new AppError('Founder profile not found', 404);
    }
    
    // Check if this post belongs to the founder
    if (existingPost.founderId.toString() !== founder.userId.toString()) {
      throw new AppError('You are not authorized to update images for this post', 403);
    }
  } else if (req.userRole === 'admin') {
    // Admin can only update images for posts they created
    if (existingPost.adminId.toString() !== req.userId) {
      throw new AppError('You are not authorized to update images for this post', 403);
    }
  }
  
  // Update the post with the new images
  const updatedPost = await PostService.updatePost(id, { images });
  
  // Log the activity
  await ActivityLogService.logActivity(
    req.userId!,
    req.userRole!,
    'Updated Post Images',
    {
      postId: id,
      founderId: existingPost.founderId,
      timestamp: new Date()
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'Post images updated successfully',
    post: updatedPost
  });
});
