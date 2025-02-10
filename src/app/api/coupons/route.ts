import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateCouponInput, CouponType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status === 'active') {
      where.isActive = true;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ];
    } else if (status === 'expired') {
      where.expiresAt = { lt: new Date() };
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { redemptions: true }
          }
        }
      }),
      prisma.coupon.count({ where })
    ]);

    return NextResponse.json({
      coupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
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
    const body: CreateCouponInput = await request.json();

    // Validate required fields
    if (!body.code || !body.type || body.value === undefined) {
      return NextResponse.json(
        { error: 'Code, type, and value are required' },
        { status: 400 }
      );
    }

    // Validate coupon type
    if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid coupon type' },
        { status: 400 }
      );
    }

    // Validate percentage value
    if (body.type === 'PERCENTAGE' && (body.value < 0 || body.value > 100)) {
      return NextResponse.json(
        { error: 'Percentage value must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Validate fixed amount
    if (body.type === 'FIXED_AMOUNT' && body.value < 0) {
      return NextResponse.json(
        { error: 'Fixed amount must be positive' },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: body.code.toUpperCase() }
    });

    if (existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon code already exists' },
        { status: 409 }
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: body.code.toUpperCase(),
        description: body.description,
        type: body.type as CouponType,
        value: body.value,
        minPurchaseAmount: body.minPurchaseAmount,
        maxUsageCount: body.maxUsageCount,
        maxUsagePerCustomer: body.maxUsagePerCustomer,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive ?? true
      }
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}