import mongoose from 'mongoose';
import { Post, IPost, PostStatus } from '../models/Post';
import { User } from '../models/User';
import { Founder } from '../models/Founder';
import AppError from '../utils/AppError';

interface PostCreateData {
  founderId: string;
  adminId: string;
  caption: string;
  images?: string[];
  scheduledDate?: Date | string;
  status: PostStatus;
  feedback?: string;
}

interface PostUpdateData {
  caption?: string;
  images?: string[];
  scheduledDate?: Date | string;
  status?: PostStatus;
  feedback?: string;
}

export class PostService {
  /**
   * Create a new post
   * @param postData Data for the new post
   * @returns The created post
   */
  static async createPost(postData: PostCreateData): Promise<IPost> {
    try {
      // Validate founderId exists and is a founder
      const founder = await Founder.findOne({ userId: postData.founderId });
      if (!founder) {
        throw new AppError('Founder not found', 404);
      }

      // Create the post
      const post = await Post.create({
        founderId: postData.founderId,  // Use the Founder document ID
        adminId: postData.adminId,
        caption: postData.caption,
        images: postData.images || [],  // Default to empty array if not provided
        scheduledDate: postData.scheduledDate,
        status: postData.status,
        feedback: postData.feedback
      });
      
      // Log the creation for debugging
      console.log(`Created post with ID: ${post._id}, founderId: ${post.founderId}, adminId: ${post.adminId}`);

      return post;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error creating post', 500);
    }
  }

  /**
   * Get posts with optional filtering
   * @param filters Filters to apply to the query
   * @param limit Maximum number of results to return
   * @param offset Number of results to skip (for pagination)
   * @returns Object containing posts array and total count
   */
  static async getPosts(
    filters: any,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ posts: IPost[]; total: number }> {
    try {
      // Process date filters if provided
      if (filters.startDate) {
        if (!filters.scheduledDate) filters.scheduledDate = {};
        filters.scheduledDate.$gte = new Date(filters.startDate);
        delete filters.startDate;
      }
      
      if (filters.endDate) {
        if (!filters.scheduledDate) filters.scheduledDate = {};
        filters.scheduledDate.$lte = new Date(filters.endDate);
        delete filters.endDate;
      }
      
      // Build the query
      const query = Post.find(filters)
        .populate('adminId', 'name email')
        .populate('founderId', 'userId companyName')
        .sort({ scheduledDate: 1, createdAt: -1 }) // Sort by scheduled date first, then creation date
        .skip(offset)
        .limit(limit);
        
      // Log the query for debugging
      console.log(`Fetching posts with filters:`, filters);

      // Execute the query
      const posts = await query.exec();
      
      // Get total count for pagination
      const total = await Post.countDocuments(filters);

      return { posts, total };
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw new AppError('Error fetching posts', 500);
    }
  }

  /**
   * Get a specific post by ID
   * @param postId ID of the post to retrieve
   * @returns The post or null if not found
   */
  static async getPostById(postId: string): Promise<IPost | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new AppError('Invalid post ID', 400);
      }

      const post = await Post.findById(postId)

      return post;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error fetching post', 500);
    }
  }

  /**
   * Update an existing post
   * @param postId ID of the post to update
   * @param updateData Data to update in the post
   * @returns The updated post
   */
  static async updatePost(
    postId: string,
    updateData: PostUpdateData
  ): Promise<IPost> {
    try {
      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new AppError('Invalid post ID', 400);
      }

      // Find and update the post
      const post = await Post.findByIdAndUpdate(
        postId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate('founderId', 'name email profile')
        .populate('adminId', 'name email');

      if (!post) {
        throw new AppError('Post not found', 404);
      }

      return post;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error updating post', 500);
    }
  }

  /**
   * Delete a post
   * @param postId ID of the post to delete
   */
  static async deletePost(postId: string): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(postId)) {
        throw new AppError('Invalid post ID', 400);
      }

      const result = await Post.findByIdAndDelete(postId);

      if (!result) {
        throw new AppError('Post not found', 404);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error deleting post', 500);
    }
  }

  /**
   * Check if a post exists
   * @param postId ID of the post to check
   * @returns Boolean indicating if the post exists
   */
  static async postExists(postId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(postId)) {
        return false;
      }

      const count = await Post.countDocuments({ _id: postId });
      return count > 0;
    } catch (error) {
      return false;
    }
  }
}
