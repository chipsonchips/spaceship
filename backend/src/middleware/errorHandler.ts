import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
  ErrorRequestHandler,
} from 'express';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error: AppError | Record<string, unknown> = { ...err };
  error.message = err.message;

  // Log error for debugging
  logger.error('Error Middleware:', { stack: err.stack, message: err.message });

  // Handle specific error types
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new AppError(message, 404);
  }

  // Handle duplicate field errors
  if ((err as unknown as Record<string, unknown>).code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values((err as unknown as Record<string, unknown>).errors as Record<string, { message: string }>)
      .map((val) => val.message)
      .join('. ');
    error = new AppError(message, 400);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  // Handle JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // Default to 500 error if status code not set
  const statusCode = (error as unknown as Record<string, unknown>).statusCode as number || 500;
  const status = (error as unknown as Record<string, unknown>).status as string || 'error';

  // Send response
  res.status(statusCode).json({
    status,
    message: (error as unknown as Record<string, unknown>).message as string || 'Internal Server Error',
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: (error as unknown as Record<string, unknown>).stack }),
  });
};

// 404 handler - catch all unhandled routes
export const notFoundHandler: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};

// Async error handler wrapper
export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
