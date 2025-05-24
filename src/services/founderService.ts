import mongoose from 'mongoose';
import { Founder, IFounder } from '../models/Founder';
import AppError from '../utils/AppError';

export class FounderService {
  /**
   * Get a founder by user ID
   * @param userId ID of the user associated with the founder
   * @returns The founder or null if not found
   */
  static async getFounderByUserId(userId: string): Promise<IFounder | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError('Invalid user ID', 400);
      }

      const founder = await Founder.findOne({ userId });
      return founder;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Error fetching founder', 500);
    }
  }

  /**
   * Check if a user is a founder
   * @param userId ID of the user to check
   * @returns Boolean indicating if the user is a founder
   */
  static async isFounder(userId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return false;
      }

      const count = await Founder.countDocuments({ userId });
      return count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all founders
   * @param filters Optional filters to apply
   * @param limit Maximum number of results to return
   * @param offset Number of results to skip (for pagination)
   * @returns Object containing founders array and total count
   */
  static async getFounders(
    filters: any = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{ founders: IFounder[]; total: number }> {
    try {
      // Build the query
      const query = Founder.find(filters)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('userId', 'name email role');

      // Execute the query
      const founders = await query.exec();
      
      // Get total count for pagination
      const total = await Founder.countDocuments(filters);

      return { founders, total };
    } catch (error) {
      throw new AppError('Error fetching founders', 500);
    }
  }
}
