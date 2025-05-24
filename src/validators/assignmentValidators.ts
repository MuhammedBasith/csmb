import { body, query } from 'express-validator';

export const assignAdminsValidation = [
  body('founderId')
    .isString()
    .notEmpty()
    .withMessage('Founder ID is required'),
  
  body('adminIds')
    .isArray()
    .withMessage('Admin IDs must be an array')
    .notEmpty()
    .withMessage('At least one admin ID is required'),
  
  body('adminIds.*')
    .isString()
    .notEmpty()
    .withMessage('Each admin ID must be a non-empty string')
];

export const getAssignedAdminsValidation = [
  query('founderId')
    .isString()
    .notEmpty()
    .withMessage('Founder ID is required')
];

export const getAssignedFoundersValidation = [
  query('adminId')
    .isString()
    .notEmpty()
    .withMessage('Admin ID is required')
];
