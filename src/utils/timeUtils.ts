import ms from 'ms';
import { DurationType } from '../types/common';

export function isValidDuration(value: string): value is DurationType {
  // Check if string matches our duration format
  return /^\d+[dhms]$|^\d+ms$/.test(value);
}

export function parseDuration(duration: DurationType): number {
  // For the ms function to work correctly, we need to ensure the input is a valid duration string
  if (!isValidDuration(duration)) {
    throw new Error('Invalid duration format');
  }
  
  const result = ms(duration);
  if (typeof result !== 'number') {
    throw new Error('Failed to parse duration');
  }
  
  return result;
}