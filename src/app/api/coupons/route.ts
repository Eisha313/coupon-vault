import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCouponInput, normalizeCode } from '@/lib/validation';
import { CouponType, CouponStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as CouponStatus | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Validate pagination
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validPage - 1) * validLimit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        include: {
          _count: {
            select: { redemptions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: validLimit,
      }),
      prisma.coupon.count({ where }),
    ]);

    return NextResponse.json({
      coupons,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateCouponInput({
      code: body.code,
      type: body.type,
      value: body.value,
      minimumPurchase: body.minimumPurchase,
      maxDiscount: body.maxDiscount,
      maxRedemptions: body.maxRedemptions,
      maxRedemptionsPerCustomer: body.maxRedemptionsPerCustomer,
      startsAt: body.startsAt,
      expiresAt: body.expiresAt,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Normalize the code
    const normalizedCode = normalizeCode(body.code);

    // Check for duplicate code
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        code: {
          equals: normalizedCode,
          mode: 'insensitive',
        },
      },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { error: 'A coupon with this code already exists' },
        { status: 409 }
      );
    }

    // Create the coupon
    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        type: body.type,
        value: body.value,
        description: body.description || null,
        minimumPurchase: body.minimumPurchase || null,
        maxDiscount: body.maxDiscount || null,
        maxRedemptions: body.maxRedemptions || null,
        maxRedemptionsPerCustomer: body.maxRedemptionsPerCustomer || null,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
