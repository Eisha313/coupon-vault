import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, cartTotal, customerId } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const trimmedCode = code.trim().toUpperCase();

    if (trimmedCode.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'Coupon code cannot be empty' },
        { status: 400 }
      );
    }

    if (cartTotal !== undefined && (typeof cartTotal !== 'number' || cartTotal < 0 || isNaN(cartTotal))) {
      return NextResponse.json(
        { valid: false, error: 'Invalid cart total' },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: trimmedCode },
      include: {
        redemptions: customerId ? {
          where: { customerId }
        } : false
      }
    });

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json(
        { valid: false, error: 'This coupon is no longer active' },
        { status: 400 }
      );
    }

    // Check expiration date
    const now = new Date();
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      return NextResponse.json(
        { valid: false, error: 'This coupon has expired' },
        { status: 400 }
      );
    }

    // Check start date
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      return NextResponse.json(
        { valid: false, error: 'This coupon is not yet valid' },
        { status: 400 }
      );
    }

    // Check usage limit
    if (coupon.maxRedemptions !== null && coupon.currentRedemptions >= coupon.maxRedemptions) {
      return NextResponse.json(
        { valid: false, error: 'This coupon has reached its usage limit' },
        { status: 400 }
      );
    }

    // Check per-customer usage limit
    if (customerId && coupon.maxRedemptionsPerCustomer !== null) {
      const customerRedemptions = await prisma.redemption.count({
        where: {
          couponId: coupon.id,
          customerId
        }
      });

      if (customerRedemptions >= coupon.maxRedemptionsPerCustomer) {
        return NextResponse.json(
          { valid: false, error: 'You have already used this coupon the maximum number of times' },
          { status: 400 }
        );
      }
    }

    // Check minimum purchase requirement
    if (cartTotal !== undefined && coupon.minPurchaseAmount !== null) {
      if (cartTotal < coupon.minPurchaseAmount) {
        return NextResponse.json(
          { 
            valid: false, 
            error: `Minimum purchase of $${coupon.minPurchaseAmount.toFixed(2)} required`,
            minPurchaseAmount: coupon.minPurchaseAmount
          },
          { status: 400 }
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (cartTotal !== undefined) {
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = (cartTotal * coupon.discountValue) / 100;
        // Apply max discount cap if set
        if (coupon.maxDiscountAmount !== null && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
      } else if (coupon.discountType === 'FIXED_AMOUNT') {
        discountAmount = Math.min(coupon.discountValue, cartTotal);
      }
      // Ensure discount doesn't exceed cart total
      discountAmount = Math.min(discountAmount, cartTotal);
      // Round to 2 decimal places
      discountAmount = Math.round(discountAmount * 100) / 100;
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minPurchaseAmount: coupon.minPurchaseAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        expiresAt: coupon.expiresAt
      },
      discountAmount,
      finalTotal: cartTotal !== undefined ? Math.round((cartTotal - discountAmount) * 100) / 100 : undefined
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { valid: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { valid: false, error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}
