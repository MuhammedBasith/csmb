import { body, query, param } from 'express-validator';

// Validation for creating a new post
export const createPostValidation = [
  body('founderId')
    .notEmpty()
    .withMessage('Founder ID is required')
    .isMongoId()
    .withMessage('Invalid founder ID format'),
  
  body('caption')
    .notEmpty()
    .withMessage('Caption is required')
    .isString()
    .withMessage('Caption must be a string')
    .isLength({ max: 10000 })
    .withMessage('Caption cannot exceed 10000 characters'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  
  body('images.*')
    .optional()
    .isString()
    .withMessage('Each image must be a string URL')
    .isURL()
    .withMessage('Each image must be a valid URL'),
  
  body('images')
    .optional()
    .custom((images) => {
      if (images && images.length > 10) {
        throw new Error('Maximum 10 images allowed per post');
      }
      return true;
    }),
  
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO date')
    .custom((value) => {
      if (value) {
        // Get today's date with time set to start of day (midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get scheduled date with time preserved
        const scheduledDate = new Date(value);
        
        // Check if scheduled date is before today (not allowing past dates)
        if (scheduledDate < today) {
          throw new Error('Scheduled date cannot be in the past');
        }
      }
      return true;
    })
];

// Validation for updating an existing post
export const updatePostValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid post ID format'),
  
  body('caption')
    .optional()
    .isString()
    .withMessage('Caption must be a string')
    .isLength({ max: 10000 })
    .withMessage('Caption cannot exceed 10000 characters'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array')
    .notEmpty()
    .withMessage('At least one image is required'),
  
  body('images.*')
    .optional()
    .isString()
    .withMessage('Each image must be a string URL')
    .isURL()
    .withMessage('Each image must be a valid URL'),
  
  body('images')
    .optional()
    .custom((images) => {
      if (images && images.length > 10) {
        throw new Error('Maximum 10 images allowed per post');
      }
      return true;
    }),
  
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO date')
    .custom((value) => {
      if (value) {
        // Get today's date with time set to start of day (midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get scheduled date with time preserved
        const scheduledDate = new Date(value);
        
        // Check if scheduled date is before today (not allowing past dates)
        if (scheduledDate < today) {
          throw new Error('Scheduled date cannot be in the past');
        }
      }
      return true;
    }),
  
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'scheduled', 'published'])
    .withMessage('Invalid status value')
];

// Validation for getting posts with filters
export const getPostsValidation = [
  query('founderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid founder ID format'),
  
  query('adminId')
    .optional()
    .isMongoId()
    .withMessage('Invalid admin ID format'),
  
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'scheduled', 'published', 'rejected'])
    .withMessage('Invalid status value'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a number between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative number')
];

// Validation for updating post status (approve/reject/post)
export const updatePostStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid post ID format'),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['approved', 'rejected', 'posted'])
    .withMessage('Status must be approved, rejected, or posted'),
  
  body('feedback')
    .custom((value, { req }) => {
      // Feedback is required if status is 'rejected'
      if (req.body.status === 'rejected' && (!value || value.trim() === '')) {
        throw new Error('Feedback is required when rejecting a post');
      }
      return true;
    })
];

// Validation for adding feedback to a post
export const addPostFeedbackValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid post ID format'),
  
  body('feedback')
    .notEmpty()
    .withMessage('Feedback is required')
    .isString()
    .withMessage('Feedback must be a string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Feedback must be between 1 and 1000 characters')
];

// Validation for updating post images
export const updatePostImagesValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid post ID format'),
  
  body('images')
    .isArray()
    .withMessage('Images must be an array'),
  
  body('images.*')
    .isString()
    .withMessage('Each image must be a string URL')
    .isURL()
    .withMessage('Each image must be a valid URL'),
  
  body('images')
    .custom((images) => {
      if (images && images.length > 10) {
        throw new Error('Maximum 10 images allowed per post');
      }
      return true;
    })
];
