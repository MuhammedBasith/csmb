// Common type definitions used across the application

// JWT Related Types
export type DurationType = 
  | `${number}d`   // days
  | `${number}h`   // hours
  | `${number}m`   // minutes
  | `${number}s`   // seconds
  | `${number}ms`; // milliseconds

// For ms package compatibility
export type MSDuration = DurationType | number;