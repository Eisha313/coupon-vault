import { NextRequest } from 'next/server';
import { couponService } from '@/services/coupon.service';
import { validateCouponInput } from '@/lib/validation';
import { apiResponse } from '@/lib/api-response';
import { CouponType } from '@/types';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const coupon = await couponService.getCouponById(id);
    
    if (!coupon) {
      return apiResponse.notFound('Coupon');
    }

    return apiResponse.success(coupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return apiResponse.internalError('Failed to fetch coupon');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();

    const existingCoupon = await couponService.getCouponById(id);
    if (!existingCoupon) {
      return apiResponse.notFound('Coupon');
    }

    const mergedData = { ...existingCoupon, ...body };
    const validation = validateCouponInput(mergedData);
    if (!validation.valid) {
      return apiResponse.validationError(
        Object.fromEntries(
          validation.errors.map(e => [e.field, [e.message]])
        )
      );
    }

    if (body.code && body.code.toUpperCase() !== existingCoupon.code) {
      const duplicateCoupon = await couponService.getCouponByCode(body.code.toUpperCase());
      if (duplicateCoupon) {
        return apiResponse.conflict(`Coupon code '${body.code.toUpperCase()}' already exists`);
      }
    }

    const updateData: Record<string, unknown> = {};
    
    if (body.code !== undefined) updateData.code = body.code.toUpperCase();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type as CouponType;
    if (body.value !== undefined) updateData.value = parseFloat(body.value);
    if (body.minPurchase !== undefined) updateData.minPurchase = body.minPurchase ? parseFloat(body.minPurchase) : null;
    if (body.maxUses !== undefined) updateData.maxUses = body.maxUses ? parseInt(body.maxUses) : null;
    if (body.maxUsesPerCustomer !== undefined) updateData.maxUsesPerCustomer = body.maxUsesPerCustomer ? parseInt(body.maxUsesPerCustomer) : null;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    const coupon = await couponService.updateCoupon(id, updateData);
    return apiResponse.success(coupon);
  } catch (error) {
    console.error('Error updating coupon:', error);
    return apiResponse.internalError('Failed to update coupon');
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const existingCoupon = await couponService.getCouponById(id);
    if (!existingCoupon) {
      return apiResponse.notFound('Coupon');
    }

    await couponService.deleteCoupon(id);
    return apiResponse.noContent();
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return apiResponse.internalError('Failed to delete coupon');
  }
}
