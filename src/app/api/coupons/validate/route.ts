import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CouponType, CouponStatus } from '@/types';

interface ValidateRequest {
  code: string;
  orderTotal?: number;
  customerId?: string;
}

interface ValidationError {
  code: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json();
    const { code, orderTotal, customerId } = body;

    // Validate required fields
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: { code: 'INVALID_REQUEST', message: 'Coupon code is required' } },
        { status: 400 }
      );
    }

    // Normalize code (trim whitespace, uppercase)
    const normalizedCode = code.trim().toUpperCase();

    if (normalizedCode.length === 0) {
      return NextResponse.json(
        { valid: false, error: { code: 'EMPTY_CODE', message: 'Coupon code cannot be empty' } },
        { status: 400 }
      );
    }

    // Find the coupon
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: {
          equals: normalizedCode,
          mode: 'insensitive',
        },
      },
      include: {
        redemptions: true,
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: { code: 'NOT_FOUND', message: 'Coupon code not found' } },
        { status: 404 }
      );
    }

    // Check if coupon is active
    if (coupon.status !== 'ACTIVE') {
      const statusMessages: Record<string, string> = {
        INACTIVE: 'This coupon is currently inactive',
        EXPIRED: 'This coupon has expired',
        DEPLETED: 'This coupon has been fully redeemed',
      };
      return NextResponse.json(
        { 
          valid: false, 
          error: { 
            code: 'COUPON_' + coupon.status, 
            message: statusMessages[coupon.status] || 'This coupon is not available' 
          } 
        },
        { status: 400 }
      );
    }

    // Check expiration date
    const now = new Date();
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      // Update coupon status to expired
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        { valid: false, error: { code: 'EXPIRED', message: 'This coupon has expired' } },
        { status: 400 }
      );
    }

    // Check start date
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      return NextResponse.json(
        { 
          valid: false, 
          error: { 
            code: 'NOT_STARTED', 
            message: `This coupon is not valid until ${new Date(coupon.startsAt).toLocaleDateString()}` 
          } 
        },
        { status: 400 }
      );
    }

    // Check usage limit
    if (coupon.maxRedemptions !== null && coupon.redemptions.length >= coupon.maxRedemptions) {
      // Update coupon status to depleted
      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { status: 'DEPLETED' },
      });

      return NextResponse.json(
        { valid: false, error: { code: 'DEPLETED', message: 'This coupon has reached its usage limit' } },
        { status: 400 }
      );
    }

    // Check per-customer limit if customerId provided
    if (customerId && coupon.maxRedemptionsPerCustomer !== null) {
      const customerRedemptions = coupon.redemptions.filter(
        (r) => r.customerId === customerId
      ).length;

      if (customerRedemptions >= coupon.maxRedemptionsPerCustomer) {
        return NextResponse.json(
          { 
            valid: false, 
            error: { 
              code: 'CUSTOMER_LIMIT_REACHED', 
              message: 'You have already used this coupon the maximum number of times' 
            } 
          },
          { status: 400 }
        );
      }
    }

    // Check minimum purchase requirement
    if (orderTotal !== undefined && coupon.minimumPurchase !== null) {
      if (orderTotal < coupon.minimumPurchase) {
        return NextResponse.json(
          { 
            valid: false, 
            error: { 
              code: 'MINIMUM_NOT_MET', 
              message: `Minimum purchase of $${coupon.minimumPurchase.toFixed(2)} required` 
            } 
          },
          { status: 400 }
        );
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (orderTotal !== undefined) {
      if (coupon.type === 'PERCENTAGE') {
        discountAmount = (orderTotal * coupon.value) / 100;
        // Apply max discount if set
        if (coupon.maxDiscount !== null && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else if (coupon.type === 'FIXED_AMOUNT') {
        discountAmount = Math.min(coupon.value, orderTotal);
      } else if (coupon.type === 'FREE_SHIPPING') {
        discountAmount = 0; // Shipping discount handled separately
      }
    }

    // Return valid coupon details
    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
        minimumPurchase: coupon.minimumPurchase,
        maxDiscount: coupon.maxDiscount,
        expiresAt: coupon.expiresAt,
      },
      discount: orderTotal !== undefined ? {
        amount: discountAmount,
        finalTotal: Math.max(0, orderTotal - discountAmount),
      } : undefined,
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { valid: false, error: { code: 'INVALID_JSON', message: 'Invalid request body' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { valid: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
