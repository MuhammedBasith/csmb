import express from 'express';
import { protect } from '../middlewares/auth';
import { authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { getAllFoundersWithStats, getSuperAdminPosts, getPostDetails } from '../controllers/superAdminController';
import { getPostsValidation } from '../validators/postValidators';

const router = express.Router();

// All routes require authentication and super admin role
router.use(protect);
router.use(authorize('super-admin'));

// Get all founders with post stats
router.get('/founders', getAllFoundersWithStats);

// Get posts for any founder with advanced filtering
router.get(
  '/posts',
  validate(getPostsValidation),
  getSuperAdminPosts
);

// Get detailed post information
router.get('/posts/:postId', getPostDetails);

export default router;
