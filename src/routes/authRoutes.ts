import express from 'express';
import { 
  register, 
  login, 
  getMe, 
  logout, 
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  revokeRefreshToken,
  getAllAdmins,
  getAllFounders,
  sendWelcomeEmail,
  getUserById
} from '../controllers/authController';
import { protect } from '../middlewares/auth';
import { checkPermission } from '../middlewares/permissions';
import { validate } from '../middlewares/validate';
import { 
  registerValidation, 
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation
} from '../validators/authValidators';

const router = express.Router();

// Public routes
router.post('/login', validate(loginValidation), login);
router.post('/forgot-password', validate(forgotPasswordValidation), forgotPassword);
router.post('/reset-password', validate(resetPasswordValidation), resetPassword);
router.post('/refresh-token', validate(refreshTokenValidation), refreshAccessToken);

// Protected routes
router.post('/logout', protect, logout);
router.post('/revoke-refresh-token', protect, revokeRefreshToken);
router.get('/me', protect, getMe);

// Super admin only routes - only super admins can create new users
router.post(
  '/register',
  protect,
  checkPermission('canManageUsers'),
  validate(registerValidation),
  register
);

// Super admin only routes - get all admins and founders
router.get(
  '/admins',
  protect,
  checkPermission('canManageUsers'),
  getAllAdmins
);

router.get(
  '/founders',
  protect,
  checkPermission('canManageUsers'),
  getAllFounders
);

// Super admin only route - send welcome email with password setup link
router.post(
  '/welcome-email/:userId',
  protect,
  checkPermission('canManageUsers'),
  sendWelcomeEmail
);

// Get user profile by ID - accessible by super admin or the user themselves
router.get(
  '/users/:userId',
  protect,
  getUserById
);

export default router;