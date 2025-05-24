import express from 'express';
import { reportController } from '../controllers/reportController';
import { protect } from '../middlewares/auth';
import { authorize } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'report-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Only accept PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max file size
});

// Routes for reports
// Upload a monthly report for a founder (Admin only)
router.post(
  '/founders/:founderId',
  protect,
  authorize('admin'),
  upload.single('report'),
  reportController.uploadReport
);

// Get all reports for a specific founder (Admin, Super Admin, Founder)
router.get(
  '/founders/:founderId',
  protect,
  authorize('admin', 'super-admin', 'founder'),
  reportController.getFounderReports
);

// Get a specific monthly report for a founder (Admin, Super Admin, Founder)
router.get(
  '/founders/:founderId/:month',
  protect,
  authorize('admin', 'super-admin', 'founder'),
  reportController.getFounderMonthlyReport
);

// Get all reports for all founders assigned to an admin (Admin only)
router.get(
  '/admin',
  protect,
  authorize('admin'),
  reportController.getAdminReports
);

// Get all reports (Super Admin only)
router.get(
  '/',
  protect,
  authorize('super-admin'),
  reportController.getAllReports
);

// Delete a report (Admin who uploaded it, Super Admin)
router.delete(
  '/:reportId',
  protect,
  authorize('admin', 'super-admin'),
  reportController.deleteReport
);

export default router;
