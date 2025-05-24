import mongoose from 'mongoose';
import { Assignment, IAssignment } from '../models/Assignment';
import { User } from '../models/User';
import { Founder } from '../models/Founder';
import { Admin } from '../models/Admin';
import AppError from '../utils/AppError';

type AdminDetails = {
  adminId: string;
  name: string;
  email: string;
};

type FounderDetails = {
  founderId: string;
  name: string;
  email: string;
  companyName: string;
  industry?: string;
};

export class AssignmentService {
  /**
   * Assign multiple admins to a founder
   * @param founderId ID of the founder
   * @param adminIds Array of admin IDs to assign
   * @param assignedBy ID of the super admin making the assignment
   */
  static async assignAdminsToFounder(
    founderId: string,
    adminIds: string[],
    assignedBy: string
  ): Promise<void> {
    // Validate founder exists and is a founder
    const founder = await Founder.findOne({ userId: founderId });
    if (!founder) {
      throw new AppError('Founder not found', 404);
    }

    const founderUser = await User.findById(founderId);
    if (!founderUser || founderUser.role !== 'founder') {
      throw new AppError('Invalid founder ID', 400);
    }

    // Validate all admin IDs exist and are admins
    for (const adminId of adminIds) {
      const admin = await Admin.findOne({ userId: adminId });
      if (!admin) {
        throw new AppError(`Admin with ID ${adminId} not found`, 404);
      }

      const adminUser = await User.findById(adminId);
      if (!adminUser || adminUser.role !== 'admin') {
        throw new AppError(`User with ID ${adminId} is not an admin`, 400);
      }
    }

    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Clear existing assignments for this founder
      await Assignment.deleteMany({ founderId: founder._id }, { session });

      // Create new assignments
      const assignments = adminIds.map(adminId => ({
        founderId: founder._id,
        adminId,
        assignedBy,
        assignedAt: new Date()
      }));

      if (assignments.length > 0) {
        await Assignment.insertMany(assignments, { session });
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get all admins assigned to a founder
   * @param founderId ID of the founder
   */
  static async getAssignedAdmins(founderId: string): Promise<AdminDetails[]> {
    // Validate founder exists
    const founder = await Founder.findOne({ userId: founderId });
    if (!founder) {
      throw new AppError('Founder not found', 404);
    }

    // Get assignments with admin details using aggregation
    const assignments = await Assignment.aggregate([
      { $match: { founderId: founder._id } },
      {
        $lookup: {
          from: 'admins',
          localField: 'adminId',
          foreignField: 'userId',
          as: 'admin'
        }
      },
      { $unwind: '$admin' },
      {
        $lookup: {
          from: 'users',
          localField: 'adminId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          adminId: '$adminId',
          name: '$user.name',
          email: '$user.email'
        }
      }
    ]);

    return assignments;
  }

  /**
   * Check if an admin is assigned to a founder
   * @param adminId ID of the admin
   * @param founderId ID of the founder
   */
  static async isAdminAssignedToFounder(
    adminId: string,
    founderId: string
  ): Promise<boolean> {
    console.log(`Checking if admin ${adminId} is assigned to founder ${founderId}`);
    
    try {
      // Get the founder document
      const founder = await Founder.findOne({ userId: founderId });
      if (!founder) {
        console.log(`Founder with userId ${founderId} not found`);
        return false;
      }
      console.log(`Found founder: ${founder._id}`);
      
      // Check if the assignment exists
      const assignment = await Assignment.findOne({
        founderId: founder._id,
        adminId: adminId // Use the adminId directly
      });
      
      console.log(`Assignment check result: ${!!assignment}`);
      return !!assignment;
    } catch (error) {
      console.error('Error checking assignment:', error);
      return false;
    }
  }

  /**
   * Get all founders assigned to an admin
   * @param adminId ID of the admin
   * @param includeCounts Whether to include post counts for each founder
   */
  static async getAssignedFounders(adminId: string, includeCounts: boolean = false): Promise<any[]> {
    // Validate admin exists
    const admin = await Admin.findOne({ userId: adminId });
    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== 'admin') {
      throw new AppError('Invalid admin ID', 400);
    }

    // Get assignments with founder details using aggregation
    const pipeline: any[] = [
      { $match: { adminId: adminUser._id } },
      {
        $lookup: {
          from: 'founders',
          localField: 'founderId',
          foreignField: '_id',
          as: 'founder'
        }
      },
      { $unwind: '$founder' },
      {
        $lookup: {
          from: 'users',
          localField: 'founder.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ];
    
    // If counts are requested, add lookups for post counts
    if (includeCounts) {
      // Add lookup for all posts
      pipeline.push({
        $lookup: {
          from: 'posts',
          let: { founderId: '$founder.userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$founderId', '$$founderId'] } } },
            { $count: 'total' }
          ],
          as: 'postsCount'
        }
      });
      
      // Add lookup for scheduled posts
      pipeline.push({
        $lookup: {
          from: 'posts',
          let: { founderId: '$founder.userId' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$founderId', '$$founderId'] },
                    { $eq: ['$status', 'scheduled'] }
                  ]
                } 
              } 
            },
            { $count: 'total' }
          ],
          as: 'scheduledCount'
        }
      });
      
      // Add lookup for approved posts
      pipeline.push({
        $lookup: {
          from: 'posts',
          let: { founderId: '$founder.userId' },
          pipeline: [
            { 
              $match: { 
                $expr: { 
                  $and: [
                    { $eq: ['$founderId', '$$founderId'] },
                    { $eq: ['$status', 'approved'] }
                  ]
                } 
              } 
            },
            { $count: 'total' }
          ],
          as: 'approvedCount'
        }
      });
    }
    
    // Project the final result
    pipeline.push({
      $project: {
        _id: 1,
        adminId: 1,
        founderId: '$founder.userId',
        assignedAt: 1,
        founder: {
          _id: '$founder.userId',
          name: '$user.name',
          email: '$user.email',
          profile: {
            companyName: '$founder.companyName',
            industry: '$founder.industry'
          },
          ...(includeCounts ? {
            postsCount: { $ifNull: [{ $arrayElemAt: ['$postsCount.total', 0] }, 0] },
            scheduledCount: { $ifNull: [{ $arrayElemAt: ['$scheduledCount.total', 0] }, 0] },
            approvedCount: { $ifNull: [{ $arrayElemAt: ['$approvedCount.total', 0] }, 0] }
          } : {})
        }
      }
    });

    return Assignment.aggregate(pipeline);
  }

  /**
   * Delete a specific assignment between an admin and a founder
   * @param adminId ID of the admin
   * @param founderId ID of the founder
   */
  static async deleteAssignment(adminId: string, founderId: string): Promise<void> {
    // Validate admin exists
    const admin = await Admin.findOne({ userId: adminId });
    if (!admin) {
      throw new AppError('Admin not found', 404);
    }

    // Validate founder exists
    const founder = await Founder.findOne({ userId: founderId });
    if (!founder) {
      throw new AppError('Founder not found', 404);
    }

    // Check if assignment exists
    const assignment = await Assignment.findOne({
      adminId: adminId,
      founderId: founder._id
    });

    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    // Delete the assignment
    await Assignment.deleteOne({
      adminId: adminId,
      founderId: founder._id
    });
  }

  /**
   * Get a founder by user ID
   * @param userId ID of the user
   * @returns Founder document or null if not found
   */
  static async getFounderByUserId(userId: string): Promise<any> {
    // Find the founder with the given user ID
    const founder = await Founder.findOne({ userId });
    return founder;
  }
}
