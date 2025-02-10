import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { code, orderAmount, customerEmail } = await request.json();

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        _count: {
          select: { redemptions: true }
        },
        redemptions: customerEmail ? {
          where: { customerEmail }
        } : false
      }
    });

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid coupon code'
      });
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon is no longer active'
      });
    }

    // Check expiration
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon has expired'
      });
    }

    // Check max usage count
    if (coupon.maxUsageCount && coupon._count.redemptions >= coupon.maxUsageCount) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon has reached its usage limit'
      });
    }

    // Check per-customer usage limit
    if (customerEmail && coupon.maxUsagePerCustomer && coupon.redemptions) {
      const customerRedemptions = coupon.redemptions.length;
      if (customerRedemptions >= coupon.maxUsagePerCustomer) {
        return NextResponse.json({
          valid: false,
          error: 'You have already used this coupon the maximum number of times'
        });
      }
    }

    // Check minimum purchase amount
    if (orderAmount !== undefined && coupon.minPurchaseAmount) {
      if (orderAmount < coupon.minPurchaseAmount) {
        return NextResponse.json({
          valid: false,
          error: `Minimum purchase amount of $${coupon.minPurchaseAmount.toFixed(2)} required`
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (orderAmount !== undefined) {
      if (coupon.type === 'PERCENTAGE') {
        discountAmount = (orderAmount * coupon.value) / 100;
      } else {
        discountAmount = Math.min(coupon.value, orderAmount);
      }
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description
      },
      discountAmount,
      finalAmount: orderAmount !== undefined ? Math.max(0, orderAmount - discountAmount) : undefined
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}