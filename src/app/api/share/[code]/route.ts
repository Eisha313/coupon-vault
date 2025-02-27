import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: params.code },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minimumPurchase: true,
        expiresAt: true,
        isActive: true,
        usageLimit: true,
        usageCount: true,
        requiresEmail: true,
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Check if coupon is valid for sharing
    if (!coupon.isActive) {
      return NextResponse.json(
        { error: 'This coupon is no longer active' },
        { status: 410 }
      );
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This coupon has expired' },
        { status: 410 }
      );
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json(
        { error: 'This coupon has reached its usage limit' },
        { status: 410 }
      );
    }

    // Format discount display
    const discountDisplay = coupon.discountType === 'percentage'
      ? `${coupon.discountValue}% off`
      : `$${coupon.discountValue.toFixed(2)} off`;

    return NextResponse.json({
      code: coupon.code,
      description: coupon.description,
      discountDisplay,
      minimumPurchase: coupon.minimumPurchase,
      expiresAt: coupon.expiresAt,
      requiresEmail: coupon.requiresEmail,
    });
  } catch (error) {
    console.error('Error fetching shared coupon:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupon' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const { email } = body;

    const coupon = await prisma.coupon.findUnique({
      where: { code: params.code },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    if (coupon.requiresEmail && !email) {
      return NextResponse.json(
        { error: 'Email is required to claim this coupon' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Record the email capture
    if (email) {
      await prisma.emailCapture.create({
        data: {
          email,
          couponId: coupon.id,
          source: 'share_link',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });
    }

    // Generate a unique claim token
    const claimToken = generateClaimToken();

    await prisma.couponClaim.create({
      data: {
        couponId: coupon.id,
        email: email || null,
        claimToken,
        claimedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Coupon claimed successfully',
      claimToken,
      code: coupon.code,
    });
  } catch (error) {
    console.error('Error claiming coupon:', error);
    return NextResponse.json(
      { error: 'Failed to claim coupon' },
      { status: 500 }
    );
  }
}

function generateClaimToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
