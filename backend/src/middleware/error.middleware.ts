import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../services/lead.service';
import { sanitizeLog } from '../utils/mask';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Safe console log with sanitized message (masks any 10-digit phone numbers)
  const safeMessage = sanitizeLog(err?.message || 'Unknown error');
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.path} - ${safeMessage}`);
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const fields = err.errors.map((e) => ({
      field: e.path.join('.') || 'body',
      message: e.message,
    }));

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data. Please check the fields.',
        fields,
      },
    });
  }

  // Handle Custom Application Errors (400, 404, 409, etc.)
  if (err instanceof AppError) {
    const responseBody: any = {
      code: err.code,
      message: err.message,
    };

    if (err.fields) {
      responseBody.fields = err.fields;
    }

    if (err.applicationId) {
      responseBody.applicationId = err.applicationId;
    }

    return res.status(err.statusCode).json({
      error: responseBody,
    });
  }

  // Catch-all for uncaught / unexpected errors (500 without stack trace)
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.',
    },
  });
}
