import { Request, Response } from 'express';
import { Founder } from '../models/Founder';
import { Post } from '../models/Post';
import { catchAsync } from '../utils/catchAsync';
import { User } from '../models/User';
import AppError from '../utils/AppError';
import { Types } from 'mongoose';

// Get all founders with their post statistics
export const getAllFoundersWithStats = catchAsync(async (req: Request, res: Response) => {
  // Get all users with founder role
  const founderUsers = await User.find({ role: 'founder' }).select('-password');
  
  // Get post stats for each founder
  const foundersWithStats = await Promise.all(
    founderUsers.map(async (founderUser) => {
      // Get founder details from Founder model
      const founderDetails = await Founder.findOne({ userId: founderUser._id });

      // Get post statistics
      const stats = await Post.aggregate([
        { $match: { founderId: founderUser._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const postStats = {
        total: 0,
        scheduled: 0,
        approved: 0,
        pending: 0
      };

      stats.forEach(({ _id, count }) => {
        if (_id === 'scheduled' || _id === 'approved' || _id === 'pending') {
          postStats[_id as keyof typeof postStats] = count;
          postStats.total += count;
        }
      });

      // Combine user data, founder details, and post stats
      return {
        id: founderUser._id,
        name: founderUser.name,
        email: founderUser.email,
        role: founderUser.role,
        verified: founderUser.verified,
        createdAt: founderUser.createdAt,
        updatedAt: founderUser.updatedAt,
        companyName: founderDetails?.companyName || '',
        industry: founderDetails?.industry || '',
        notes: founderDetails?.notes || '',
        postStats
      };
    })
  );

  // Format response to match frontend expectations
  const formattedData = foundersWithStats.map(founder => ({
    id: founder.id,
    name: founder.name,
    email: founder.email,
    role: founder.role,
    verified: founder.verified,
    companyName: founder.companyName,
    industry: founder.industry,
    createdAt: founder.createdAt,
    updatedAt: founder.updatedAt,
    postStats: founder.postStats
  }));

  res.status(200).json({
    success: true,
    count: formattedData.length,
    data: formattedData
  });
});

// Get posts with advanced filtering for super admin
// Get detailed post information including founder, admin, and history
export const getPostDetails = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;

  // Get post with founder and admin details
  interface PopulatedUser {
    _id: Types.ObjectId;
    name: string;
    email: string;
  }

  interface PopulatedPost extends Omit<typeof Post, 'founderId' | 'adminId'> {
    founderId: PopulatedUser;
    adminId?: PopulatedUser;
  }

  const post = await Post.findById(postId)
    .populate<{ founderId: PopulatedUser }>({
      path: 'founderId',
      model: 'User',
      select: '_id name email'
    })
    .populate<{ adminId: PopulatedUser }>({
      path: 'adminId',
      model: 'User',
      select: '_id name email'
    });

  if (!post) {
    throw new AppError('Post not found', 404);
  }

  // Get founder details
  const founderDetails = await Founder.findOne({ userId: post.founderId });

  // Format response
  const response = {
    _id: post._id,
    caption: post.caption,
    images: post.images,
    status: post.status,
    scheduledDate: post.scheduledDate,
    feedback: post.feedback,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,

    founder: {
      _id: post.founderId._id,
      name: post.founderId.name,
      email: post.founderId.email,
      companyName: founderDetails?.companyName || '',
      industry: founderDetails?.industry || ''
    },

    handledBy: post.adminId ? {
      adminId: post.adminId._id,
      name: post.adminId.name,
      email: post.adminId.email,
      actionDate: post.updatedAt
    } : null,

    // Note: If you want to implement history, you'll need to create a new model
    // for tracking post changes and query it here
    history: []
  };

  res.status(200).json({
    success: true,
    post: response
  });
});

// Get paginated list of posts with basic information
export const getSuperAdminPosts = catchAsync(async (req: Request, res: Response) => {
  const {
    founderId,
    status,
    startDate,
    endDate,
    limit = 20,
    offset = 0
  } = req.query;

  const query: any = {};
  
  // Add filters
  if (founderId) query.founderId = founderId;
  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate as string);
    if (endDate) query.createdAt.$lte = new Date(endDate as string);
  }

  // Get total count for pagination
  const total = await Post.countDocuments(query);

  // Get posts with pagination
  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .skip(Number(offset))
    .limit(Number(limit))
    .populate('founderId', 'name email')
    .populate('adminId', 'name email');

  res.status(200).json({
    success: true,
    posts,
    total,
    limit: Number(limit),
    offset: Number(offset)
  });
});
