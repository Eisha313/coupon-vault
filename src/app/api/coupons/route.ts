import { NextRequest } from 'next/server';
import { couponService } from '@/services/coupon.service';
import { validateCouponInput } from '@/lib/validation';
import { apiResponse } from '@/lib/api-response';
import { CouponType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as 'active' | 'expired' | 'disabled' | null;
    const search = searchParams.get('search') || undefined;

    const result = await couponService.getCoupons({
      page,
      limit,
      status: status || undefined,
      search,
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
    
    const validation = validateCouponInput(body);
    if (!validation.valid) {
      return apiResponse.validationError(
        Object.fromEntries(
          validation.errors.map(e => [e.field, [e.message]])
        )
      );
    }

    const couponData = {
      code: body.code.toUpperCase(),
      description: body.description || null,
      type: body.type as CouponType,
      value: parseFloat(body.value),
      minPurchase: body.minPurchase ? parseFloat(body.minPurchase) : null,
      maxUses: body.maxUses ? parseInt(body.maxUses) : null,
      maxUsesPerCustomer: body.maxUsesPerCustomer ? parseInt(body.maxUsesPerCustomer) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      isActive: body.isActive ?? true,
      metadata: body.metadata || {},
    };

    const existingCoupon = await couponService.getCouponByCode(couponData.code);
    if (existingCoupon) {
      return apiResponse.conflict(`Coupon code '${couponData.code}' already exists`);
    }

    const coupon = await couponService.createCoupon(couponData);
    return apiResponse.created(coupon);
  } catch (error) {
    console.error('Error creating coupon:', error);
    return apiResponse.internalError('Failed to create coupon');
  }
}
