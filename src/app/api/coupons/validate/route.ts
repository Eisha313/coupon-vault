import { NextRequest } from 'next/server';
import { CouponService } from '@/services/coupon.service';
import { validateCouponSchema, formatValidationErrors, safeParseNumber } from '@/lib/validation';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON in request body', 400);
    }

    if (!body || typeof body !== 'object') {
      return apiError('Request body must be an object', 400);
    }

    const rawBody = body as Record<string, unknown>;
    
    // Pre-process cart total to handle string numbers
    const processedBody = {
      ...rawBody,
      cartTotal: safeParseNumber(rawBody.cartTotal) ?? rawBody.cartTotal,
    };

    const validationResult = validateCouponSchema.safeParse(processedBody);

    if (!validationResult.success) {
      return apiValidationError(formatValidationErrors(validationResult.error));
    }

    const { code, cartTotal, customerId } = validationResult.data;

    const result = await CouponService.validate(code, cartTotal, customerId);

    if (!result.valid) {
      return apiError(result.error || 'Invalid coupon', 400);
    }

    return apiSuccess({
      valid: true,
      coupon: {
        code: result.coupon!.code,
        type: result.coupon!.type,
        value: result.coupon!.value,
        description: result.coupon!.description,
      },
      discount: result.discount,
      finalTotal: Math.max(0, Math.round((cartTotal - (result.discount || 0)) * 100) / 100),
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    
    if (error instanceof Error) {
      return apiError(error.message, 500);
    }
    
    return apiError('An unexpected error occurred while validating the coupon', 500);
  }
}
