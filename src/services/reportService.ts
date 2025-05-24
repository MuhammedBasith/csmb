import { Report, IReport } from '../models/Report';
import { Founder } from '../models/Founder';
import { User } from '../models/User';
import { S3Service } from './s3Service';
import AppError from '../utils/AppError';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Interface for enhanced report with founder details
interface EnhancedReport extends IReport {
  founder?: {
    _id: string;
    name: string;
    email: string;
    companyName: string;
    industry?: string;
    notes?: string;
  };
}

export class ReportService {
  /**
   * Upload a monthly report for a founder
   * @param file Report file (PDF)
   * @param founderId ID of the founder
   * @param adminId ID of the admin uploading the report
   * @param month Month in YYYY-MM format
   * @returns The created report object
   */
  static async uploadReport(
    file: Express.Multer.File,
    founderId: string,
    adminId: string,
    month: string
  ): Promise<IReport> {
    // Validate month format
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new AppError('Invalid month format. Use YYYY-MM format.', 400);
    }

    // Validate file type (must be PDF)
    if (file.mimetype !== 'application/pdf') {
      fs.unlinkSync(file.path); // Delete the uploaded file
      throw new AppError('Only PDF files are allowed for reports', 400);
    }

    // Check if report already exists for this founder and month
    const existingReport = await Report.findOne({ founderId, month });
    
    // If report exists, delete the old file from S3
    if (existingReport) {
      try {
        await S3Service.deleteFile(existingReport.url);
      } catch (error) {
        console.error('Error deleting existing report:', error);
        // Continue with upload even if delete fails
      }
    }

    // Generate folder path for the report
    const folder = S3Service.getReportFolder(founderId);
    
    // Upload the file to S3
    const fileUrl = await S3Service.uploadFile(file, folder);

    // Create or update the report record
    const report = existingReport 
      ? await Report.findByIdAndUpdate(
          existingReport._id,
          { url: fileUrl, uploadedBy: adminId },
          { new: true }
        )
      : await Report.create({
          founderId,
          month,
          url: fileUrl,
          uploadedBy: adminId
        });

    if (!report) {
      throw new AppError('Failed to create or update report', 500);
    }

    return report;
  }

  /**
   * Get all reports for a specific founder
   * @param founderId ID of the founder
   * @returns Array of report objects
   */
  static async getFounderReports(founderId: string): Promise<IReport[]> {
    return Report.find({ founderId })
      .sort({ month: -1 })
      .populate('uploadedBy', 'name email')
      .exec();
  }

  /**
   * Get a specific monthly report for a founder
   * @param founderId ID of the founder
   * @param month Month in YYYY-MM format
   * @returns Report object if found
   */
  static async getFounderMonthlyReport(
    founderId: string,
    month: string
  ): Promise<IReport | null> {
    return Report.findOne({ founderId, month })
      .populate('uploadedBy', 'name email')
      .exec();
  }

  /**
   * Get all reports for all founders assigned to an admin
   * @param adminId ID of the admin
   * @param assignedFounderIds Array of founder IDs assigned to the admin
   * @returns Array of report objects
   */
  static async getAdminReports(
    adminId: string,
    assignedFounderIds: string[]
  ): Promise<EnhancedReport[]> {
    // First, try to fix any reports with null founderId
    await this.fixReportsWithNullFounderId();
    
    // Get all reports for the admin
    const reports = await Report.find({
      $or: [
        { founderId: { $in: assignedFounderIds } },
        { founderId: null, uploadedBy: adminId }
      ]
    })
      .sort({ month: -1, founderId: 1 })
      .populate('founderId')
      .populate('uploadedBy', 'name email')
      .lean()
      .exec() as any[];
    
    return this.enhanceReportsWithFounderDetails(reports);
  }
  
  /**
   * Helper method to enhance reports with founder details
   * @param reports Array of report objects
   * @returns Enhanced reports with founder details
   */
  private static async enhanceReportsWithFounderDetails(reports: any[]): Promise<EnhancedReport[]> {
    // Extract founder IDs from reports - either from founderId field or from URL
    const founderIdsMap = new Map<string, string>(); // Map of reportId -> founderId
    
    reports.forEach(report => {
      // First try to get founderId from the report object
      if (report.founderId) {
        const founderId = typeof report.founderId === 'object' ? report.founderId.toString() : report.founderId;
        founderIdsMap.set(report._id.toString(), founderId);
      } else if (report.url) {
        // If founderId is null, try to extract it from the URL
        // URL format: https://blowlin-test-bucket.s3.us-east-1.amazonaws.com/reports/founders/{founderId}/filename.pdf
        try {
          const urlParts = report.url.split('/');
          const founderIdIndex = urlParts.indexOf('founders') + 1;
          
          if (founderIdIndex > 0 && founderIdIndex < urlParts.length) {
            const founderId = urlParts[founderIdIndex];
            if (founderId && mongoose.Types.ObjectId.isValid(founderId)) {
              founderIdsMap.set(report._id.toString(), founderId);
            }
          }
        } catch (error) {
          console.error(`Error extracting founderId from URL for report ${report._id}:`, error);
        }
      }
    });
    
    // Get unique founder IDs
    const founderIds = [...new Set(founderIdsMap.values())];
    
    if (founderIds.length === 0) {
      return reports as EnhancedReport[];
    }
    
    // Fetch all founders in one query with their user details
    const founders = await Founder.find({
      _id: { $in: founderIds }
    })
      .select('_id userId companyName industry notes')
      .populate({
        path: 'userId',
        select: 'name email',
        model: 'User'
      })
      .lean()
      .exec() as any[];
    
    // Create a map of founder details for quick lookup
    const founderMap = new Map<string, any>();
    for (const founder of founders) {
      founderMap.set(founder._id.toString(), founder);
    }
    
    // Enhance reports with complete founder details
    const enhancedReports = reports.map(report => {
      // Get the founderId for this report from our map
      const reportId = report._id.toString();
      const founderId = founderIdsMap.get(reportId);
      
      if (founderId) {
        const founderDetails = founderMap.get(founderId);
        
        if (founderDetails) {
          return {
            ...report,
            founder: {
              _id: founderDetails._id,
              name: founderDetails.userId.name,
              email: founderDetails.userId.email,
              companyName: founderDetails.companyName,
              industry: founderDetails.industry || null,
              notes: founderDetails.notes || null
            }
          };
        }
      }
      
      // If we couldn't find founder details, return the report with null founder
      return report;
    });
    
    return enhancedReports as EnhancedReport[];
  }

  /**
   * Get all reports (for super admin)
   * @returns Array of report objects
   */
  static async getAllReports(): Promise<EnhancedReport[]> {
    // Get all reports
    const reports = await Report.find()
      .sort({ month: -1, founderId: 1 })
      .populate('founderId')
      .populate('uploadedBy', 'name email')
      .lean()
      .exec() as any[];
    
    return this.enhanceReportsWithFounderDetails(reports);
  }

  /**
   * Get a report by ID
   * @param reportId ID of the report
   * @returns Report object if found
   */
  static async getReportById(reportId: string): Promise<IReport | null> {
    return Report.findById(reportId)
      .populate('founderId', 'name email profile')
      .populate('uploadedBy', 'name email')
      .exec();
  }

  /**
   * Delete a report
   * @param reportId ID of the report to delete
   * @returns Success message
   */
  /**
   * Fix reports with null founderId by extracting the founderId from the URL
   */
  /**
   * Fix a specific report that we know has a null founderId
   */
  static async fixSpecificReport(): Promise<void> {
    try {
      const reportId = '683094e144e41d86fa338fb3';
      const founderId = '681e382f7c9845f2e4d91833'; // Extracted from the URL
      
      console.log(`Directly fixing report ${reportId} with founderId ${founderId}`);
      
      const result = await Report.findByIdAndUpdate(
        reportId,
        { founderId },
        { new: true }
      );
      
      console.log('Direct update result:', result);
    } catch (error) {
      console.error('Error fixing specific report:', error);
    }
  }
  
  static async fixReportsWithNullFounderId(): Promise<void> {
    console.log('Starting to fix reports with null founderId');
    const reportsWithNullFounderId = await Report.find({ founderId: null });
    console.log(`Found ${reportsWithNullFounderId.length} reports with null founderId`);
    
    for (const report of reportsWithNullFounderId) {
      try {
        console.log(`Processing report ${report._id} with URL: ${report.url}`);
        // Try to extract founderId from the URL
        // URL format: https://blowlin-test-bucket.s3.us-east-1.amazonaws.com/reports/founders/{founderId}/filename.pdf
        const urlParts = report.url.split('/');
        console.log('URL parts:', urlParts);
        const founderIdIndex = urlParts.indexOf('founders') + 1;
        console.log(`Founder ID index: ${founderIdIndex}`);
        
        if (founderIdIndex > 0 && founderIdIndex < urlParts.length) {
          const founderId = urlParts[founderIdIndex];
          console.log(`Extracted founderId: ${founderId}`);
          
          if (founderId && mongoose.Types.ObjectId.isValid(founderId)) {
            console.log(`Fixing report ${report._id} with founderId ${founderId} extracted from URL`);
            const result = await Report.findByIdAndUpdate(report._id, { founderId });
            console.log('Update result:', result);
          } else {
            console.log(`Invalid founderId: ${founderId}`);
          }
        } else {
          console.log('Could not find founders in URL path');
        }
      } catch (error) {
        console.error(`Error fixing report ${report._id}:`, error);
      }
    }
  }
  
  static async deleteReport(reportId: string): Promise<{ message: string }> {
    const report = await Report.findById(reportId);
    
    if (!report) {
      throw new AppError('Report not found', 404);
    }

    // Delete file from S3
    try {
      await S3Service.deleteFile(report.url);
    } catch (error) {
      console.error('Error deleting report file from S3:', error);
      // Continue with deletion even if S3 delete fails
    }

    // Delete report record
    await Report.findByIdAndDelete(reportId);
    
    return { message: 'Report deleted successfully' };
  }
}
