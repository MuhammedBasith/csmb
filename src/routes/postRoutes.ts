import express from 'express';
import { 
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  updatePostStatus,
  addPostFeedback,
  updatePostImages
} from '../controllers/postController';
import { protect } from '../middlewares/auth';
import { checkPermission } from '../middlewares/permissions';
import { validate } from '../middlewares/validate';
import { 
  createPostValidation,
  updatePostValidation,
  getPostsValidation,
  updatePostStatusValidation,
  addPostFeedbackValidation,
  updatePostImagesValidation
} from '../validators/postValidators';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get posts with optional filtering
router.get(
  '/',
  validate(getPostsValidation),
  getPosts
);

// Create a new post
router.post(
  '/',
  validate(createPostValidation),
  createPost
);

// Get a specific post by ID
router.get(
  '/:id',
  getPostById
);

// Update an existing post
router.put(
  '/:id',
  validate(updatePostValidation),
  updatePost
);

// Delete a post
router.delete(
  '/:id',
  deletePost
);

// Update post status (approve/reject/post)
router.patch(
  '/:id/status',
  validate(updatePostStatusValidation),
  updatePostStatus
);

// Add feedback to a post
router.post(
  '/:id/feedback',
  validate(addPostFeedbackValidation),
  addPostFeedback
);

// Update post images
router.patch(
  '/:id/images',
  validate(updatePostImagesValidation),
  updatePostImages
);

export default router;
