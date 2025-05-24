import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { logRequest } from './middlewares/logRequest';
import authRoutes from './routes/authRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import postRoutes from './routes/postRoutes';
import uploadRoutes from './routes/uploadRoutes';
import superAdminRoutes from './routes/superAdminRoutes';
import reportRoutes from './routes/reportRoutes';
import metricsRoutes from './routes/metricsRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import adminDashboardRoutes from './routes/adminDashboardRoutes';
import logger from './utils/logger';
import path from 'path';


const app: Express = express();

app.use(logRequest);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use(limiter);

// Security Middleware
app.use(helmet());

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
}));

// Body parsing Middleware
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true }));

// Logging Middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});



// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/admin/super', superAdminRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/metrics', metricsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/admin-dashboard', adminDashboardRoutes);


// Error Handling Middleware
interface ErrorResponse extends Error {
  statusCode?: number;
}

app.use((err: ErrorResponse, req: Request, res: Response, next: NextFunction) => {
  // Log error
  logger.error({
    message: err.message,
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
  });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Not Found',
  });
});

export default app;