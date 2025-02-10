import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdateCouponInput } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { redemptions: true }
        },
        redemptions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            customerEmail: true,
            orderAmount: true,
            discountAmount: true,
            createdAt: true
          }
        }
      }
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupon' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateCouponInput = await request.json();

    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id: params.id }
    });

    if (!existingCoupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Validate percentage value if updating
    if (body.type === 'PERCENTAGE' && body.value !== undefined) {
      if (body.value < 0 || body.value > 100) {
        return NextResponse.json(
          { error: 'Percentage value must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate code if updating code
    if (body.code && body.code !== existingCoupon.code) {
      const duplicateCoupon = await prisma.coupon.findUnique({
        where: { code: body.code.toUpperCase() }
      });

      if (duplicateCoupon) {
        return NextResponse.json(
          { error: 'Coupon code already exists' },
          { status: 409 }
        );
      }
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id: params.id },
      data: {
        ...(body.code && { code: body.code.toUpperCase() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type && { type: body.type }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.minPurchaseAmount !== undefined && { minPurchaseAmount: body.minPurchaseAmount }),
        ...(body.maxUsageCount !== undefined && { maxUsageCount: body.maxUsageCount }),
        ...(body.maxUsagePerCustomer !== undefined && { maxUsagePerCustomer: body.maxUsagePerCustomer }),
        ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
        ...(body.isActive !== undefined && { isActive: body.isActive })
      }
    });

    return NextResponse.json(updatedCoupon);
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { redemptions: true }
        }
      }
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Soft delete if coupon has redemptions
    if (coupon._count.redemptions > 0) {
      await prisma.coupon.update({
        where: { id: params.id },
        data: { isActive: false }
      });

      return NextResponse.json({
        message: 'Coupon deactivated (has redemption history)'
      });
    }

    // Hard delete if no redemptions
    await prisma.coupon.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}