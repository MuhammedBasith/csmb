import express from 'express';
import { uploadImages } from '../controllers/uploadController';
import { protect } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { body, query } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for temporary image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to only allow image files
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// All routes require authentication
router.use(protect);

// Validation for image uploads
const uploadImageValidation = [
  query('founderId')
    .notEmpty()
    .withMessage('Founder ID is required')
    .isMongoId()
    .withMessage('Invalid founder ID format')
];

// Upload images endpoint
router.post(
  '/images',
  validate(uploadImageValidation),
  upload.array('images', 20), // Allow up to 20 images
  uploadImages
);

export default router;
