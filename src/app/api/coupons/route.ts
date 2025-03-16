import { NextRequest } from 'next/server';
import { CouponService } from '@/services/coupon.service';
import { createCouponSchema, formatValidationErrors } from '@/lib/validation';
import { apiResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await CouponService.findAll({
      status,
      search,
      limit,
      offset: (page - 1) * limit,
    });

    return apiResponse.success(result.coupons, {
      page,
      limit,
      total: result.total,
      hasMore: page * limit < result.total,
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return apiResponse.internalError('Failed to fetch coupons');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCouponSchema.safeParse(body);

    if (!parsed.success) {
      return apiResponse.validationError(formatValidationErrors(parsed.error));
    }

    const coupon = await CouponService.create(parsed.data);
    return apiResponse.created(coupon);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return apiResponse.conflict(error.message);
    }
    console.error('Error creating coupon:', error);
    return apiResponse.internalError('Failed to create coupon');
  }
}
