import { NextResponse } from 'next/server';

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
};

export type ApiErrorResponse = {
  success: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiResponseHelper {
  static success<T>(data: T, meta?: ApiSuccessResponse<T>['meta'], status = 200) {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
    };
    if (meta) {
      response.meta = meta;
    }
    return NextResponse.json(response, { status });
  }

  static created<T>(data: T) {
    return this.success(data, undefined, 201);
  }

  static noContent() {
    return new NextResponse(null, { status: 204 });
  }

  static error(code: string, message: string, status = 400, details?: Record<string, unknown>) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    };
    return NextResponse.json(response, { status });
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return this.error('BAD_REQUEST', message, 400, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return this.error('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return this.error('FORBIDDEN', message, 403);
  }

  static notFound(resource = 'Resource') {
    return this.error('NOT_FOUND', `${resource} not found`, 404);
  }

  static conflict(message: string) {
    return this.error('CONFLICT', message, 409);
  }

  static validationError(errors: Record<string, string[]>) {
    return this.error('VALIDATION_ERROR', 'Validation failed', 422, { errors });
  }

  static internalError(message = 'Internal server error') {
    return this.error('INTERNAL_ERROR', message, 500);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return this.error('SERVICE_UNAVAILABLE', message, 503);
  }
}

export const apiResponse = ApiResponseHelper;
