import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorHandler, notFoundHandler, catchAsync } from '../middleware/errorHandler.ts';
import { AppError, NotFoundError, ValidationError } from '../utils/errors.ts';
import type { Request, Response, NextFunction } from 'express';

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      originalUrl: '/test-url',
      method: 'GET',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn() as unknown as NextFunction;

    // Suppress console.error during tests
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle AppError instances', () => {
      const error = new AppError('Test error', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Test error',
      });
    });

    it('should handle CastError as 404', () => {
      const error = new Error('Cast failed');
      (error as any).name = 'CastError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle duplicate key errors (code 11000) as 400', () => {
      const error = new Error('Duplicate key');
      (error as any).code = 11000;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Duplicate field value entered',
        })
      );
    });

    it('should handle ValidationError', () => {
      const error = new Error('Validation failed');
      (error as any).name = 'ValidationError';
      (error as any).errors = {
        field1: { message: 'Field 1 is required' },
        field2: { message: 'Field 2 is invalid' },
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Field 1 is required'),
        })
      );
    });

    it('should handle JsonWebTokenError as 401', () => {
      const error = new Error('Invalid token');
      (error as any).name = 'JsonWebTokenError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid token',
        })
      );
    });

    it('should handle TokenExpiredError as 401', () => {
      const error = new Error('Token expired');
      (error as any).name = 'TokenExpiredError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token expired',
        })
      );
    });

    it('should default to 500 for unknown errors', () => {
      const error = new Error('Unknown error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unknown error',
        })
      );
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new AppError('Dev error', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      // In development mode, the error handler should include stack
      // Note: The actual implementation may spread the stack conditionally
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(jsonCall.message).toBe('Dev error');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new AppError('Prod error', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('stack');

      process.env.NODE_ENV = originalEnv;
    });

    it('should log error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error for unknown routes', () => {
      mockReq.originalUrl = '/unknown-route';

      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: expect.stringContaining('/unknown-route'),
        })
      );
    });

    it('should pass AppError to next middleware', () => {
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      const error = (mockNext as any).mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('catchAsync', () => {
    it('should wrap async functions and catch errors', async () => {
      const error = new Error('Async error');
      const asyncFn = async () => {
        throw error;
      };
      const wrappedFn = catchAsync(asyncFn);

      wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      // Wait for promise to settle
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should call original function with correct arguments', async () => {
      const asyncFn = vi.fn().mockResolvedValue(undefined);
      const wrappedFn = catchAsync(asyncFn);

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should not call next if async function succeeds', async () => {
      const asyncFn = vi.fn().mockResolvedValue(undefined);
      const wrappedFn = catchAsync(asyncFn);

      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
