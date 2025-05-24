import express from 'express';
import { 
  assignAdminsToFounder,
  getAssignedAdmins,
  getAssignedFounders,
  deleteAssignment
} from '../controllers/assignmentController';
import { protect } from '../middlewares/auth';
import { checkPermission } from '../middlewares/permissions';
import { validate } from '../middlewares/validate';
import { 
  assignAdminsValidation,
  getAssignedAdminsValidation,
  getAssignedFoundersValidation
} from '../validators/assignmentValidators';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Assign admins to a founder - super-admin only
router.post(
  '/',
  checkPermission('canManageUsers'),
  validate(assignAdminsValidation),
  assignAdminsToFounder
);

// Get all admins assigned to a founder - super-admin only
router.get(
  '/',
  checkPermission('canManageUsers'),
  validate(getAssignedAdminsValidation),
  getAssignedAdmins
);

// Get all founders assigned to an admin - accessible by admins
router.get(
  '/founders',
  validate(getAssignedFoundersValidation),
  getAssignedFounders
);

// Delete a specific assignment between an admin and a founder
router.delete(
  '/:adminId/:founderId',
  protect,
  checkPermission('canManageUsers'),
  deleteAssignment
);

export default router;
