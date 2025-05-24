import { body, ValidationChain } from 'express-validator';

const baseUserValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['founder', 'admin'])
    .withMessage('Invalid role specified')
];

const founderValidation: ValidationChain[] = [
  body('companyName')
    .if(body('role').equals('founder'))
    .trim()
    .notEmpty()
    .withMessage('Company name is required for founders')
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  body('industry')
    .if(body('role').equals('founder'))
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Industry cannot exceed 50 characters')
];

const adminValidation: ValidationChain[] = [
  body('bio')
    .if(body('role').equals('admin'))
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
];

export const registerValidation = [
  ...baseUserValidation,
  ...founderValidation,
  ...adminValidation
];

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
];

export const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
];

export const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

export const refreshTokenValidation = [
  body('refreshToken')
    .trim()
    .notEmpty()
    .withMessage('Refresh token is required')
];