import mongoose from 'mongoose';
import { Founder, IFounder } from '../models/Founder';
import { User } from '../models/User';
import { FounderMetrics } from '../models/FounderMetrics';
import { Assignment } from '../models/Assignment';

// Type guard to check if a founder object has been populated with its user data
function isPopulatedFounder(obj: any): obj is IFounder & {
  userId: {
    _id: mongoose.Types.ObjectId;
    name: string;
    email?: string;
  };
} {
  return obj && 
    typeof obj === 'object' && 
    'userId' in obj && 
    obj.userId && 
    typeof obj.userId === 'object' && 
    'name' in obj.userId;
}

/**
 * Service for admin dashboard operations
 */
export class AdminDashboardService {
  // Helper function to check if a founder object has been properly populated
  private static isPopulatedFounder(founder: any): founder is { userId: { name: string }; companyName?: string } {
    return founder && 
           typeof founder === 'object' && 
           founder.userId && 
           typeof founder.userId === 'object' &&
           founder.userId.name;
  }
  
  // Helper function to fetch founder data with proper population
  private static async fetchFounderWithUserData(founderId: string | mongoose.Types.ObjectId): Promise<any> {
    try {
      // Convert to ObjectId if it's a string
      const id = typeof founderId === 'string' 
        ? new mongoose.Types.ObjectId(founderId)
        : founderId;
      
      // Use aggregation to get both founder and user data in one query
      const founderData = await Founder.aggregate([
        { $match: { _id: id } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } }
      ]);
      
      if (founderData && founderData.length > 0) {
        return {
          ...founderData[0],
          userId: founderData[0].userInfo // Restructure to match expected format
        };
      }
      
      // Fallback to regular populate if aggregation fails
      return await Founder.findById(id)
        .populate('userId', 'name email')
        .lean();
        
    } catch (error) {
      console.error('Error fetching founder with user data:', error);
      return null;
    }
  }

  /**
   * Get main dashboard statistics for an admin
   * @param adminId The ID of the admin
   * @returns Dashboard statistics
   */
  static async getAdminDashboardStats(adminId: string): Promise<any> {
    // Get current date and previous month
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const prevMonthDate = new Date(currentDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Get assigned founders
    const assignments = await Assignment.find({ adminId }).populate('founderId').lean();
    const assignedFounderIds = assignments.map(assignment => 
      typeof assignment.founderId === 'object' ? assignment.founderId._id : assignment.founderId
    );
    const assignedFoundersCount = assignedFounderIds.length;

    // Get total active founders for comparison
    const totalActiveFounders = await Founder.countDocuments({ 
      $or: [{ isActive: true }, { isActive: { $exists: false } }] 
    });

    // Get metrics completion rate
    const foundersWithCurrentMonthMetrics = await FounderMetrics.distinct('founderId', { 
      founderId: { $in: assignedFounderIds },
      month: currentMonth
    });
    
    const metricsCompletionRate = assignedFoundersCount > 0 
      ? Math.round((foundersWithCurrentMonthMetrics.length / assignedFoundersCount) * 100) 
      : 0;

    // Get average founder performance
    const currentMonthMetrics = await FounderMetrics.find({ 
      founderId: { $in: assignedFounderIds },
      month: currentMonth
    });
    
    const totalImpressions = currentMonthMetrics.reduce((sum, metric) => sum + (metric.totalImpressions || 0), 0);
    const totalEngagement = currentMonthMetrics.reduce((sum, metric) => sum + (metric.totalCommentOutreach || 0), 0);
    const avgImpressions = currentMonthMetrics.length > 0 ? Math.round(totalImpressions / currentMonthMetrics.length) : 0;
    const avgEngagement = currentMonthMetrics.length > 0 ? Math.round(totalEngagement / currentMonthMetrics.length) : 0;

    // Get metrics needing attention (founders without updates in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlyUpdatedFounderIds = await FounderMetrics.distinct('founderId', { 
      founderId: { $in: assignedFounderIds },
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const foundersNeedingAttention = assignedFounderIds.filter(
      id => !recentlyUpdatedFounderIds.some(updatedId => 
        updatedId.toString() === id.toString()
      )
    ).length;

    return {
      assignedFoundersCount: {
        count: assignedFoundersCount,
        totalActiveFounders,
        percentage: totalActiveFounders > 0 ? Math.round((assignedFoundersCount / totalActiveFounders) * 100) : 0
      },
      metricsCompletionRate: {
        percentage: metricsCompletionRate,
        completedCount: foundersWithCurrentMonthMetrics.length,
        totalAssigned: assignedFoundersCount
      },
      averageFounderPerformance: {
        impressions: avgImpressions,
        engagement: avgEngagement,
        formattedImpressions: this.formatNumber(avgImpressions),
        formattedEngagement: this.formatNumber(avgEngagement)
      },
      metricsNeedingAttention: {
        count: foundersNeedingAttention,
        percentage: assignedFoundersCount > 0 ? Math.round((foundersNeedingAttention / assignedFoundersCount) * 100) : 0
      }
    };
  }

  /**
   * Get recent activities for an admin's dashboard
   * @param adminId The ID of the admin
   * @returns Recent activities data
   */
  static async getAdminRecentActivities(adminId: string): Promise<any> {
    // Get current date and previous month
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const prevMonthDate = new Date(currentDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Get assigned founders
    const assignments = await Assignment.find({ adminId }).populate('founderId').lean();
    const assignedFounderIds = assignments.map(assignment => 
      typeof assignment.founderId === 'object' ? assignment.founderId._id : assignment.founderId
    );

    // Get latest metrics uploads by this admin using a more robust approach
    const latestMetricsUploads = await FounderMetrics.find({ 
      uploadedBy: new mongoose.Types.ObjectId(adminId) 
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    // Populate founder data properly using our helper method
    const populatedMetricsUploads = await Promise.all(latestMetricsUploads.map(async (metric) => {
      if (metric.founderId) {
        const founderWithUserData = await AdminDashboardService.fetchFounderWithUserData(metric.founderId);
        if (founderWithUserData) {
          return {
            ...metric,
            founderData: {
              ...founderWithUserData,
              userId: undefined // Remove to avoid duplication
            },
            userData: founderWithUserData.userId
          };
        }
      }
      return metric;
    }));

    // Format latest metrics uploads
    const formattedLatestUploads = populatedMetricsUploads.map((metric: any) => {
      // Get founder name and company name from our populated data
      let founderName = 'Unknown';
      let companyName = 'Unknown';
      
      // First check userData which should have the name
      if (metric.userData && metric.userData.name) {
        founderName = metric.userData.name;
      }
      
      // Then check founderData which should have company name
      if (metric.founderData && metric.founderData.companyName) {
        companyName = metric.founderData.companyName;
      }
      
      return {
        id: metric._id,
        founderName,
        companyName,
        month: metric.month,
        impressions: metric.totalImpressions,
        formattedImpressions: this.formatNumber(metric.totalImpressions || 0),
        timestamp: metric.createdAt
      };
    });

    // Get founder performance highlights
    const performanceHighlights: Array<{
      id: any; // Using 'any' for _id to avoid TypeScript errors
      founderName: string;
      companyName: string;
      impressionsGrowth: number;
      engagementGrowth: number;
      month: string;
    }> = [];
    
    // Compare current month with previous month for each founder
    for (const founderId of assignedFounderIds) {
      const currentMonthMetric = await FounderMetrics.findOne({ 
        founderId, 
        month: currentMonth 
      }).lean();
      
      const prevMonthMetric = await FounderMetrics.findOne({ 
        founderId, 
        month: prevMonth 
      }).lean();
      
      if (currentMonthMetric && prevMonthMetric) {
        const impressionsGrowth = prevMonthMetric.totalImpressions > 0 
          ? Math.round(((currentMonthMetric.totalImpressions - prevMonthMetric.totalImpressions) / prevMonthMetric.totalImpressions) * 100) 
          : 0;
        
        const engagementGrowth = prevMonthMetric.totalCommentOutreach > 0 
          ? Math.round(((currentMonthMetric.totalCommentOutreach - prevMonthMetric.totalCommentOutreach) / prevMonthMetric.totalCommentOutreach) * 100) 
          : 0;
        
        // Only include significant growth (>20%)
        if (impressionsGrowth > 20 || engagementGrowth > 20) {
          // Get founder details
          const founder = await Founder.findById(founderId)
            .populate('userId', 'name')
            .lean();
          
          let founderName = 'Unknown';
          let companyName = 'Unknown';
          
          if (founder && isPopulatedFounder(founder)) {
            founderName = founder.userId.name;
            companyName = founder.companyName || 'Unknown';
          }
          
          performanceHighlights.push({
            id: currentMonthMetric._id,
            founderName,
            companyName,
            impressionsGrowth,
            engagementGrowth,
            month: currentMonthMetric.month
          });
        }
      }
    }
    
    // Sort by highest growth
    performanceHighlights.sort((a, b) => Math.max(b.impressionsGrowth, b.engagementGrowth) - Math.max(a.impressionsGrowth, a.engagementGrowth));

    // Get upcoming deadlines (founders without metrics for current month)
    const foundersWithCurrentMonthMetrics = await FounderMetrics.distinct('founderId', { 
      founderId: { $in: assignedFounderIds },
      month: currentMonth
    });
    
    const foundersWithoutCurrentMetrics = assignedFounderIds.filter(
      id => !foundersWithCurrentMonthMetrics.some(metricId => 
        metricId.toString() === id.toString()
      )
    );
    
    const upcomingDeadlines: Array<{
      id: any; // Using 'any' for _id to avoid TypeScript errors
      founderName: string;
      companyName: string;
      month: string;
      daysLeft: number;
    }> = [];
    
    for (const founderId of foundersWithoutCurrentMetrics) {
      const founder = await Founder.findById(founderId)
        .populate('userId', 'name')
        .lean();
      
      if (founder) {
        let founderName = 'Unknown';
        let companyName = 'Unknown';
        
        if (isPopulatedFounder(founder)) {
          founderName = founder.userId.name;
          companyName = founder.companyName || 'Unknown';
        }
        
        upcomingDeadlines.push({
          id: founder._id,
          founderName,
          companyName,
          month: currentMonth,
          daysLeft: this.getDaysLeftInMonth()
        });
      }
    }

    // Get system updates (hardcoded for now, in a real app this would come from a database)
    const systemUpdates = [
      {
        id: '1',
        title: 'New Metrics Dashboard',
        description: 'We\'ve updated the metrics dashboard with new visualizations',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        id: '2',
        title: 'Export Feature Added',
        description: 'You can now export metrics data to CSV',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
      }
    ];

    return {
      latestMetricsUploads: formattedLatestUploads,
      performanceHighlights: performanceHighlights.slice(0, 5), // Top 5 only
      upcomingDeadlines,
      systemUpdates
    };
  }

  /**
   * Get graph data for an admin's dashboard
   * @param adminId The ID of the admin
   * @returns Graph data
   */
  static async getAdminGraphData(adminId: string): Promise<any> {
    // Get current date
    const currentDate = new Date();
    
    // Generate last 12 months
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.unshift(monthStr); // Add to beginning to maintain chronological order
    }

    // Get assigned founders
    const assignments = await Assignment.find({ adminId }).populate('founderId').lean();
    const assignedFounderIds = assignments.map(assignment => 
      typeof assignment.founderId === 'object' ? assignment.founderId._id : assignment.founderId
    );
    
    // Get metrics update frequency
    const metricsUpdateFrequency = await Promise.all(assignedFounderIds.map(async (founderId) => {
      const founder = await Founder.findById(founderId)
        .populate('userId', 'name')
        .lean();
      
      let founderName = 'Unknown';
      let companyName = 'Unknown';
      
      if (founder && isPopulatedFounder(founder)) {
        founderName = founder.userId.name;
        companyName = founder.companyName || 'Unknown';
      }
      
      const monthlyUpdates = await Promise.all(months.map(async (month) => {
        const count = await FounderMetrics.countDocuments({ 
          founderId,
          month,
          uploadedBy: adminId
        });
        
        return {
          month,
          updatesCount: count
        };
      }));
      
      return {
        founderId,
        founderName,
        companyName,
        monthlyUpdates
      };
    }));

    // Get founder performance comparison
    const founderPerformanceComparison = await Promise.all(assignedFounderIds.map(async (founderId) => {
      const founder = await Founder.findById(founderId)
        .populate('userId', 'name')
        .lean();
      
      let founderName = 'Unknown';
      let companyName = 'Unknown';
      
      if (founder && isPopulatedFounder(founder)) {
        founderName = founder.userId.name;
        companyName = founder.companyName || 'Unknown';
      }
      
      const currentMonthMetric = await FounderMetrics.findOne({ 
        founderId, 
        month: months[months.length - 1] // Latest month
      }).lean();
      
      return {
        founderId,
        founderName,
        companyName,
        impressions: currentMonthMetric?.totalImpressions || 0,
        engagement: currentMonthMetric?.totalCommentOutreach || 0,
        posts: currentMonthMetric?.totalPosts || 0
      };
    }));
    
    // Sort by impressions
    founderPerformanceComparison.sort((a, b) => b.impressions - a.impressions);

    // Get metrics trends over time
    const metricsTrends = await Promise.all(months.map(async (month) => {
      const metrics = await FounderMetrics.find({ 
        founderId: { $in: assignedFounderIds },
        month
      });
      
      const totalImpressions = metrics.reduce((sum, metric) => sum + (metric.totalImpressions || 0), 0);
      const totalEngagement = metrics.reduce((sum, metric) => sum + (metric.totalCommentOutreach || 0), 0);
      const totalPosts = metrics.reduce((sum, metric) => sum + (metric.totalPosts || 0), 0);
      const metricsCount = metrics.length;
      
      return {
        month,
        totalImpressions,
        totalEngagement,
        totalPosts,
        metricsCount,
        avgImpressions: metricsCount > 0 ? Math.round(totalImpressions / metricsCount) : 0,
        avgEngagement: metricsCount > 0 ? Math.round(totalEngagement / metricsCount) : 0,
        avgPosts: metricsCount > 0 ? Math.round(totalPosts / metricsCount) : 0
      };
    }));

    // Get admin activity timeline using our robust approach
    const adminActivities = await FounderMetrics.find({ 
      uploadedBy: new mongoose.Types.ObjectId(adminId) 
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
    
    // Populate founder data properly using our helper method
    const populatedAdminActivities = await Promise.all(adminActivities.map(async (activity) => {
      if (activity.founderId) {
        const founderWithUserData = await AdminDashboardService.fetchFounderWithUserData(activity.founderId);
        if (founderWithUserData) {
          return {
            ...activity,
            founderData: {
              ...founderWithUserData,
              userId: undefined // Remove to avoid duplication
            },
            userData: founderWithUserData.userId
          };
        }
      }
      return activity;
    }));
    
    const adminActivityTimeline = populatedAdminActivities.map((activity: any) => {
      // Get founder name and company name from our populated data
      let founderName = 'Unknown';
      let companyName = 'Unknown';
      
      // First check userData which should have the name
      if (activity.userData && activity.userData.name) {
        founderName = activity.userData.name;
      }
      
      // Then check founderData which should have company name
      if (activity.founderData && activity.founderData.companyName) {
        companyName = activity.founderData.companyName;
      }
      
      return {
        id: activity._id,
        type: 'metrics_upload',
        founderName,
        companyName,
        month: activity.month,
        timestamp: activity.createdAt
      };
    });

    return {
      metricsUpdateFrequency,
      founderPerformanceComparison,
      metricsTrends,
      adminActivityTimeline
    };
  }

  /**
   * Get all dashboard data for an admin in a single request
   * @param adminId The ID of the admin
   * @returns All dashboard data
   */
  static async getAdminDashboardAll(adminId: string): Promise<any> {
    const [stats, activities, graphData] = await Promise.all([
      this.getAdminDashboardStats(adminId),
      this.getAdminRecentActivities(adminId),
      this.getAdminGraphData(adminId)
    ]);

    return {
      stats,
      activities,
      graphData
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

  /**
   * Helper method to get days left in the current month
   * @returns Number of days left in the current month
   */
  private static getDaysLeftInMonth(): number {
    const date = new Date();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return lastDay - date.getDate();
  }
}
