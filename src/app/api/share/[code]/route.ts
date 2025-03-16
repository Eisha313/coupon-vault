import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: params.code.toUpperCase() },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minimumPurchase: true,
        endDate: true,
        status: true,
        maxRedemptions: true,
        currentRedemptions: true,
      },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    if (coupon.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 410 });
    }

    if (coupon.endDate && new Date(coupon.endDate) < new Date()) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 410 });
    }

    if (coupon.maxRedemptions && coupon.currentRedemptions >= coupon.maxRedemptions) {
      return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 410 });
    }

    const discountDisplay =
      coupon.discountType === 'PERCENTAGE'
        ? `${coupon.discountValue}% off`
        : `$${coupon.discountValue.toFixed(2)} off`;

    return NextResponse.json({
      code: coupon.code,
      description: coupon.description,
      discountDisplay,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumPurchase: coupon.minimumPurchase,
      endDate: coupon.endDate,
    });
  } catch (error) {
    console.error('Error fetching shared coupon:', error);
    return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const { email } = body;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: params.code.toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    if (email) {
      await prisma.emailCapture.upsert({
        where: { email_couponId: { email, couponId: coupon.id } },
        update: {},
        create: { email, couponId: coupon.id, source: 'share_link' },
      });
    }

    return NextResponse.json({ success: true, code: coupon.code });
  } catch (error) {
    console.error('Error claiming coupon:', error);
    return NextResponse.json({ error: 'Failed to claim coupon' }, { status: 500 });
  }
}
