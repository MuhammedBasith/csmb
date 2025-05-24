import { FounderMetrics, IFounderMetrics } from '../models/FounderMetrics';
import { Founder } from '../models/Founder';
import { User } from '../models/User';
import mongoose from 'mongoose';
import AppError from '../utils/AppError';

interface MetricsData {
  totalPosts: number;
  totalImpressions: number;
  totalCommentOutreach: number;
  notes?: string;
}

interface EnhancedMetrics extends IFounderMetrics {
  founder?: {
    _id: string;
    name: string;
    email: string;
    companyName: string;
    industry?: string;
  };
}

export class MetricsService {
  /**
   * Upload metrics for a founder
   * @param founderId ID of the founder
   * @param uploaderId ID of the user uploading the metrics (admin or super-admin)
   * @param month Month in YYYY-MM format
   * @param data Metrics data
   * @returns The created metrics object
   */
  static async uploadMetrics(
    founderId: string,
    uploaderId: string,
    month: string,
    data: MetricsData
  ): Promise<IFounderMetrics> {
    // Check if metrics already exist for this founder and month
    const existingMetrics = await FounderMetrics.findOne({
      founderId,
      month
    });

    if (existingMetrics) {
      // Update existing metrics
      existingMetrics.totalPosts = data.totalPosts;
      existingMetrics.totalImpressions = data.totalImpressions;
      existingMetrics.totalCommentOutreach = data.totalCommentOutreach;
      existingMetrics.notes = data.notes;
      existingMetrics.uploadedBy = new mongoose.Types.ObjectId(uploaderId);
      
      await existingMetrics.save();
      return existingMetrics;
    }

    // Create new metrics
    const metrics = await FounderMetrics.create({
      founderId,
      uploadedBy: uploaderId,
      month,
      totalPosts: data.totalPosts,
      totalImpressions: data.totalImpressions,
      totalCommentOutreach: data.totalCommentOutreach,
      notes: data.notes
    });

    return metrics;
  }

  /**
   * Get metrics for a specific founder
   * @param founderId ID of the founder
   * @returns Array of metrics objects
   */
  static async getFounderMetrics(founderId: string): Promise<IFounderMetrics[]> {
    return FounderMetrics.find({ founderId })
      .sort({ month: -1 })
      .populate('uploadedBy', 'name email')
      .exec();
  }

  /**
   * Get metrics for a specific founder for a specific month
   * @param founderId ID of the founder
   * @param month Month in YYYY-MM format
   * @returns Metrics object or null if not found
   */
  static async getFounderMonthlyMetrics(
    founderId: string,
    month: string
  ): Promise<IFounderMetrics | null> {
    return FounderMetrics.findOne({ founderId, month })
      .populate('uploadedBy', 'name email')
      .exec();
  }

  /**
   * Get all metrics for all founders assigned to an admin
   * @param adminId ID of the admin
   * @param assignedFounderIds Array of founder IDs assigned to the admin
   * @returns Array of enhanced metrics objects with founder details
   */
  static async getAdminMetrics(
    adminId: string,
    assignedFounderIds: string[]
  ): Promise<EnhancedMetrics[]> {
    // Get all metrics for the assigned founders
    const metrics = await FounderMetrics.find({
      founderId: { $in: assignedFounderIds }
    })
      .sort({ month: -1, founderId: 1 })
      .populate('uploadedBy', 'name email')
      .lean()
      .exec() as any[];

    return this.enhanceMetricsWithFounderDetails(metrics);
  }

  /**
   * Get all metrics (for super admin)
   * @returns Array of enhanced metrics objects with founder details
   */
  static async getAllMetrics(): Promise<EnhancedMetrics[]> {
    // Get all metrics
    const metrics = await FounderMetrics.find()
      .sort({ month: -1, founderId: 1 })
      .populate('uploadedBy', 'name email')
      .lean()
      .exec() as any[];

    return this.enhanceMetricsWithFounderDetails(metrics);
  }

  /**
   * Get metrics by ID
   * @param metricsId ID of the metrics
   * @returns Metrics object or null if not found
   */
  static async getMetricsById(metricsId: string): Promise<IFounderMetrics | null> {
    return FounderMetrics.findById(metricsId)
      .populate('uploadedBy', 'name email')
      .exec();
  }

  /**
   * Delete metrics
   * @param metricsId ID of the metrics to delete
   * @returns Object with success message
   */
  static async deleteMetrics(metricsId: string): Promise<{ message: string }> {
    const result = await FounderMetrics.deleteOne({ _id: metricsId });
    
    if (result.deletedCount === 0) {
      throw new AppError('Metrics not found', 404);
    }
    
    return { message: 'Metrics deleted successfully' };
  }

  /**
   * Helper method to enhance metrics with founder name only
   * @param metrics Array of metrics objects
   * @returns Enhanced metrics with founder name
   */
  private static async enhanceMetricsWithFounderDetails(metrics: any[]): Promise<EnhancedMetrics[]> {
    // Process each metric one by one
    const enhancedMetrics = [];
    
    for (const metric of metrics) {
      // Skip if no founderId
      if (!metric.founderId) {
        enhancedMetrics.push(metric);
        continue;
      }
      
      try {
        // Get the founder document
        const founder = await User.findById(metric.founderId);
        if (!founder) {
          enhancedMetrics.push(metric);
          continue;
        }
        
        // Get the user document
        const user = await User.findById(founder._id);
        if (!user) {
          enhancedMetrics.push(metric);
          continue;
        }
        
        // Add founder name to the metric
        enhancedMetrics.push({
          ...metric,
          founder: {
            name: user.name
          }
        });
      } catch (error) {
        // If any error occurs, just return the original metric
        enhancedMetrics.push(metric);
      }
    }
    
    return enhancedMetrics as EnhancedMetrics[];
  }
}
