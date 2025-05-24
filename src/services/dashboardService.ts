import mongoose from 'mongoose';
import { Founder } from '../models/Founder';
import { User } from '../models/User';
import { FounderMetrics } from '../models/FounderMetrics';
import { Assignment } from '../models/Assignment';

// Define interfaces for type safety
// Define a type guard to check if an object is a populated Founder document
function isPopulatedFounder(obj: any): obj is {
  _id: mongoose.Types.ObjectId;
  userId: {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
  };
  companyName: string;
  industry?: string;
} {
  return obj && 
    typeof obj === 'object' && 
    'userId' in obj && 
    obj.userId && 
    typeof obj.userId === 'object' && 
    'name' in obj.userId;
}

interface AdminAssignmentMap {
  [key: string]: any[];
}

interface MetricWithPopulatedData {
  _id: mongoose.Types.ObjectId;
  founderId: {
    _id: mongoose.Types.ObjectId;
    userId: {
      _id: mongoose.Types.ObjectId;
      name: string;
      email?: string;
    };
    companyName: string;
    industry?: string;
  } | mongoose.Types.ObjectId;
  uploadedBy: {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
  } | mongoose.Types.ObjectId;
  month: string;
  totalPosts: number;
  totalImpressions: number;
  totalCommentOutreach: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminData {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  [key: string]: any;
}

/**
 * Service for dashboard-related operations
 */
export class DashboardService {
  /**
   * Get main dashboard statistics for super admin
   * @returns Dashboard statistics
   */
  static async getMainDashboardStats(): Promise<any> {
    // Get current date and previous month
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const prevMonthDate = new Date(currentDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Get total active founders - consider all founders as active if isActive field is not present
    const totalFounders = await Founder.countDocuments({ $or: [{ isActive: true }, { isActive: { $exists: false } }] });
    const totalFoundersPrevMonth = await Founder.countDocuments({ 
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
      createdAt: { $lt: prevMonthDate }
    });
    const foundersTrend = totalFounders - totalFoundersPrevMonth;

    // Get total posts published this month
    const currentMonthMetrics = await FounderMetrics.find({ month: currentMonth });
    const totalPostsThisMonth = currentMonthMetrics.reduce((sum, metric) => sum + (metric.totalPosts || 0), 0);
    
    const prevMonthMetrics = await FounderMetrics.find({ month: prevMonth });
    const totalPostsPrevMonth = prevMonthMetrics.reduce((sum, metric) => sum + (metric.totalPosts || 0), 0);
    const postsTrend = totalPostsThisMonth - totalPostsPrevMonth;

    // Get overall engagement metrics
    const totalImpressions = currentMonthMetrics.reduce((sum, metric) => sum + (metric.totalImpressions || 0), 0);
    const totalCommentOutreach = currentMonthMetrics.reduce((sum, metric) => sum + (metric.totalCommentOutreach || 0), 0);
    
    // Get admin performance
    const uniqueAdminsThisMonth = new Set(currentMonthMetrics.map(metric => metric.uploadedBy.toString()));
    const adminsUploadedThisMonth = uniqueAdminsThisMonth.size;
    
    // Get total admins
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    
    // Get percentage of founders with updated metrics
    const foundersWithMetricsThisMonth = new Set(currentMonthMetrics.map(metric => metric.founderId.toString()));
    const percentageFoundersUpdated = totalFounders > 0 
      ? Math.round((foundersWithMetricsThisMonth.size / totalFounders) * 100) 
      : 0;

    return {
      totalActiveFounders: {
        count: totalFounders,
        trend: foundersTrend
      },
      totalPostsPublished: {
        count: totalPostsThisMonth,
        trend: postsTrend
      },
      overallEngagement: {
        impressions: this.formatNumber(totalImpressions),
        commentOutreach: this.formatNumber(totalCommentOutreach)
      },
      adminPerformance: {
        activeAdmins: adminsUploadedThisMonth,
        totalAdmins,
        percentageActive: totalAdmins > 0 ? Math.round((adminsUploadedThisMonth / totalAdmins) * 100) : 0
      },
      metricsCompletion: {
        percentage: percentageFoundersUpdated
      }
    };
  }

  /**
   * Get recent activities for the dashboard
   * @returns Recent activities data
   */
  static async getRecentActivities(): Promise<any> {
    // Get current date
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Get latest metrics uploads
    const latestMetricsUploads = await FounderMetrics.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('uploadedBy', 'name email')
      .lean();
      
    console.log('Latest metrics uploads:', JSON.stringify(latestMetricsUploads, null, 2));

    // Find the founder data for each metric if it's not already populated
    const metricsWithFounders = await Promise.all(latestMetricsUploads.map(async (metric) => {
      // If founderId is already populated with founder data, use it
      if (metric.founderId && typeof metric.founderId === 'object' && 'userId' in metric.founderId) {
        return metric;
      }
      
      // Otherwise, try to find the founder by ID
      if (metric.founderId) {
        try {
          const founderId = typeof metric.founderId === 'object' ? metric.founderId._id : metric.founderId;
          const founder = await Founder.findById(founderId)
            .populate('userId', 'name email')
            .lean();
            
          if (founder) {
            return {
              ...metric,
              founderId: founder
            };
          }
        } catch (error) {
          console.error('Error fetching founder:', error);
        }
      }
      
      return metric;
    }));
    
    // Format latest metrics uploads
    const formattedLatestUploads = metricsWithFounders.map((metric) => {
      // Extract founder data if available
      const founder = typeof metric.founderId === 'object' ? metric.founderId : null;
      // Use type guard to safely access userId
      const user = founder && isPopulatedFounder(founder) ? founder.userId : null;
      
      return {
        id: metric._id,
        adminName: typeof metric.uploadedBy === 'object' && metric.uploadedBy && 'name' in metric.uploadedBy 
          ? metric.uploadedBy.name 
          : 'Unknown',
        founderName: user && 'name' in user ? user.name : 'Unknown',
        companyName: founder && 'companyName' in founder ? founder.companyName : 'Unknown',
        month: metric.month,
        timestamp: metric.createdAt
      };
    });

    // Get top performing founders (highest impressions this month)
    const topPerformingFounders = await FounderMetrics.find({ month: currentMonth })
      .sort({ totalImpressions: -1 })
      .limit(5)
      .lean();
      
    console.log('Top performing founders:', JSON.stringify(topPerformingFounders, null, 2));
    
    // Debug: Let's check if we have any founders in the database
    const foundersInDb = await Founder.find().populate('userId', 'name email').lean();
    console.log('All founders in database:', JSON.stringify(foundersInDb, null, 2));

    // Find the founder data for each metric if it's not already populated
    const topMetricsWithFounders = await Promise.all(topPerformingFounders.map(async (metric) => {
      // If founderId is already populated with founder data, use it
      if (metric.founderId && typeof metric.founderId === 'object' && 'userId' in metric.founderId) {
        return metric;
      }
      
      // Otherwise, try to find the founder by ID
      if (metric.founderId) {
        try {
          const founderId = typeof metric.founderId === 'object' ? metric.founderId._id : metric.founderId;
          const founder = await Founder.findById(founderId)
            .populate('userId', 'name email')
            .lean();
            
          if (founder) {
            return {
              ...metric,
              founderId: founder
            };
          }
        } catch (error) {
          console.error('Error fetching founder:', error);
        }
      }
      
      return metric;
    }));
    
    // Format top performing founders
    const formattedTopFounders = topMetricsWithFounders.map((metric) => {
      // Try to find previous month metrics for growth calculation
      const prevMonthDate = new Date(currentDate);
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Extract founder data if available
      const founder = typeof metric.founderId === 'object' ? metric.founderId : null;
      // Use type guard to safely access userId
      const user = founder && isPopulatedFounder(founder) ? founder.userId : null;
      
      return {
        id: founder ? founder._id : undefined,
        founderName: user && 'name' in user ? user.name : 'Unknown',
        companyName: founder && 'companyName' in founder ? founder.companyName : 'Unknown',
        industry: founder && 'industry' in founder ? founder.industry : 'Unknown',
        impressions: metric.totalImpressions,
        formattedImpressions: this.formatNumber(metric.totalImpressions || 0),
        posts: metric.totalPosts
      };
    });

    // Get admins requiring attention (no uploads in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get all admins
    const allAdmins = await User.find({ role: 'admin' }).select('_id name email').lean();
    
    // Get admins who have uploaded in the last 30 days
    const recentlyActiveAdminIds = await FounderMetrics.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).distinct('uploadedBy');
    
    const recentlyActiveAdminIdStrings = recentlyActiveAdminIds.map(id => id.toString());
    
    // Filter out admins who haven't uploaded recently
    const adminsRequiringAttention = allAdmins.filter(admin => 
      !recentlyActiveAdminIdStrings.includes(admin._id.toString())
    );

    // Get assignments for these admins
    const adminAssignments = await Assignment.find({
      adminId: { $in: adminsRequiringAttention.map(admin => admin._id) }
    }).populate('founderId', 'companyName').lean();

    // Group assignments by admin
    const adminAssignmentMap: AdminAssignmentMap = adminAssignments.reduce((map: AdminAssignmentMap, assignment) => {
      const adminId = assignment.adminId.toString();
      if (!map[adminId]) {
        map[adminId] = [];
      }
      map[adminId].push(assignment);
      return map;
    }, {});

    // Format admins requiring attention
    const formattedAdminsRequiringAttention = adminsRequiringAttention.map((admin) => {
      const adminId = admin._id.toString();
      const assignments = adminAssignmentMap[adminId] || [];
      return {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        assignedFoundersCount: assignments.length,
        lastUploadDate: null // We know it's more than 30 days ago
      };
    }).sort((a, b) => b.assignedFoundersCount - a.assignedFoundersCount);

    // Get upcoming milestones
    // Founders approaching 100, 500, 1000 total posts
    const milestones = [100, 500, 1000];
    const upcomingMilestones = [];

    // Use the founders we already fetched above
    // This avoids the redeclaration issue and reuses data we already have
    
    for (const founder of foundersInDb) {
      // Get total posts for this founder across all time
      const founderMetrics = await FounderMetrics.find({ founderId: founder._id });
      const totalPosts = founderMetrics.reduce((sum, metric) => sum + (metric.totalPosts || 0), 0);
      
      // Check if approaching any milestone
      for (const milestone of milestones) {
        if (totalPosts < milestone && totalPosts >= milestone - 10) {
          upcomingMilestones.push({
            id: founder._id,
            founderName: isPopulatedFounder(founder) ? founder.userId.name : 'Unknown',
            companyName: founder.companyName || 'Unknown',
            currentPosts: totalPosts,
            milestone: milestone,
            postsAway: milestone - totalPosts
          });
          break; // Only add the next milestone they're approaching
        }
      }
    }

    return {
      latestMetricsUploads: formattedLatestUploads,
      topPerformingFounders: formattedTopFounders,
      adminsRequiringAttention: formattedAdminsRequiringAttention,
      upcomingMilestones: upcomingMilestones
    };
  }

  /**
   * Get graph data for the dashboard
   * @returns Graph data
   */
  static async getGraphData(): Promise<any> {
    // Get platform-wide growth trends (last 12 months)
    const months: string[] = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.unshift(monthStr); // Add to beginning to maintain chronological order
    }

    // Get metrics for each month
    const monthlyMetrics = await Promise.all(months.map(async (month) => {
      const metrics = await FounderMetrics.find({ month });
      
      return {
        month,
        totalPosts: metrics.reduce((sum, metric) => sum + (metric.totalPosts || 0), 0),
        totalImpressions: metrics.reduce((sum, metric) => sum + (metric.totalImpressions || 0), 0),
        totalCommentOutreach: metrics.reduce((sum, metric) => sum + (metric.totalCommentOutreach || 0), 0),
        metricsCount: metrics.length
      };
    }));

    // Get admin activity comparison
    const admins = await User.find({ role: 'admin' }).select('_id name').lean();
    
    const adminActivity = await Promise.all(admins.map(async (admin) => {
      const monthlyActivity = await Promise.all(months.map(async (month) => {
        const count = await FounderMetrics.countDocuments({ 
          uploadedBy: admin._id,
          month
        });
        
        return {
          month,
          uploadsCount: count
        };
      }));
      
      return {
        adminId: admin._id,
        adminName: admin.name,
        monthlyActivity
      };
    }));

    // Get founder distribution by industry
    const foundersByIndustry = await Founder.aggregate([
      {
        $group: {
          _id: '$industry',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Format industry distribution
    const industryDistribution = foundersByIndustry.map(item => ({
      industry: item._id || 'Unknown',
      count: item.count
    }));

    // Get metrics completion rate
    const allFoundersCount = await Founder.countDocuments();
    
    const metricsCompletionRate = await Promise.all(months.map(async (month) => {
      const foundersWithMetrics = await FounderMetrics.distinct('founderId', { month });
      const completionRate = allFoundersCount > 0 
        ? Math.round((foundersWithMetrics.length / allFoundersCount) * 100) 
        : 0;
      
      return {
        month,
        completionRate
      };
    }));

    return {
      platformGrowthTrends: monthlyMetrics,
      adminActivity,
      industryDistribution,
      metricsCompletionRate
    };
  }

  /**
   * Helper method to format large numbers (e.g., 1.2M, 5.3K)
   * @param num Number to format
   * @returns Formatted number string
   */
  private static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  }
}
