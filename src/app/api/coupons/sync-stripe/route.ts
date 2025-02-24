import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncCouponToStripe, deleteStripeCoupon } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { couponId, action } = body;

    if (!couponId) {
      return NextResponse.json(
        { error: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    if (action === 'sync') {
      await syncCouponToStripe(couponId);
      return NextResponse.json({
        success: true,
        message: 'Coupon synced to Stripe successfully',
      });
    } else if (action === 'delete') {
      await deleteStripeCoupon(coupon.code);
      await prisma.coupon.update({
        where: { id: couponId },
        data: {
          metadata: {
            ...((coupon.metadata as object) || {}),
            stripeSynced: false,
            stripeDeletedAt: new Date().toISOString(),
          },
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Coupon removed from Stripe successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "sync" or "delete"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Stripe sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Stripe' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get('couponId');

    if (!couponId) {
      return NextResponse.json(
        { error: 'Coupon ID is required' },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const metadata = coupon.metadata as { stripeSynced?: boolean; stripeSyncedAt?: string } | null;

    return NextResponse.json({
      couponId: coupon.id,
      code: coupon.code,
      stripeSynced: metadata?.stripeSynced || false,
      stripeSyncedAt: metadata?.stripeSyncedAt || null,
    });
  } catch (error) {
    console.error('Stripe sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
