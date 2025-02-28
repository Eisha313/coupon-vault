import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const emailCaptureSchema = z.object({
  email: z.string().email('Invalid email address'),
  couponCode: z.string().min(1, 'Coupon code is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, couponCode } = emailCaptureSchema.parse(body);

    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Check if email already captured for this coupon
    const existingCapture = await prisma.emailCapture.findFirst({
      where: {
        email: email.toLowerCase(),
        couponId: coupon.id,
      },
    });

    if (existingCapture) {
      return NextResponse.json(
        { message: 'Email already registered for this coupon', alreadyExists: true },
        { status: 200 }
      );
    }

    // Create email capture record
    const capture = await prisma.emailCapture.create({
      data: {
        email: email.toLowerCase(),
        couponId: coupon.id,
        source: 'share_page',
        metadata: {
          userAgent: request.headers.get('user-agent') || '',
          capturedAt: new Date().toISOString(),
        },
      },
    });

    // Update coupon analytics
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: {
        metadata: {
          ...(coupon.metadata as object || {}),
          emailCaptureCount: ((coupon.metadata as any)?.emailCaptureCount || 0) + 1,
        },
      },
    });

    // TODO: Send email with coupon code (integrate with email service)
    // For now, we just log it
    console.log(`Email captured: ${email} for coupon ${couponCode}`);

    return NextResponse.json({
      success: true,
      message: 'Email captured successfully',
      captureId: capture.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Email capture error:', error);
    return NextResponse.json(
      { error: 'Failed to capture email' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get('couponId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = couponId ? { couponId } : {};

    const [captures, total] = await Promise.all([
      prisma.emailCapture.findMany({
        where,
        include: {
          coupon: {
            select: {
              code: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailCapture.count({ where }),
    ]);

    return NextResponse.json({
      captures,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch email captures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email captures' },
      { status: 500 }
    );
  }
}
