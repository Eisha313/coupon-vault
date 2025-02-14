import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateBulkCoupons, validateBulkOptions, BulkGenerationOptions } from '@/lib/bulk-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationErrors = validateBulkOptions(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    const options: BulkGenerationOptions = {
      count: body.count,
      prefix: body.prefix?.toUpperCase(),
      length: body.length || 8,
      discountType: body.discountType,
      discountValue: parseFloat(body.discountValue),
      minPurchaseAmount: body.minPurchaseAmount ? parseFloat(body.minPurchaseAmount) : undefined,
      maxUses: body.maxUses ? parseInt(body.maxUses) : undefined,
      maxUsesPerCustomer: body.maxUsesPerCustomer ? parseInt(body.maxUsesPerCustomer) : 1,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      metadata: body.metadata || {},
    };

    const generatedCoupons = generateBulkCoupons(options);

    // Check for existing codes
    const existingCodes = await prisma.coupon.findMany({
      where: {
        code: {
          in: generatedCoupons.map(c => c.code),
        },
      },
      select: { code: true },
    });

    if (existingCodes.length > 0) {
      return NextResponse.json(
        { 
          error: 'Code collision detected', 
          details: `${existingCodes.length} codes already exist. Please try again.` 
        },
        { status: 409 }
      );
    }

    // Batch insert coupons
    const createdCoupons = await prisma.coupon.createMany({
      data: generatedCoupons.map(coupon => ({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minPurchaseAmount: coupon.minPurchaseAmount,
        maxUses: coupon.maxUses,
        maxUsesPerCustomer: coupon.maxUsesPerCustomer,
        expiresAt: coupon.expiresAt,
        metadata: coupon.metadata,
        isActive: true,
        usageCount: 0,
      })),
    });

    // Fetch the created coupons for response
    const coupons = await prisma.coupon.findMany({
      where: {
        code: {
          in: generatedCoupons.map(c => c.code),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      count: createdCoupons.count,
      coupons: coupons,
      batchId: (generatedCoupons[0]?.metadata as Record<string, unknown>)?.batchId,
    }, { status: 201 });
  } catch (error) {
    console.error('Bulk generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate coupons' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    const coupons = await prisma.coupon.findMany({
      where: {
        metadata: {
          path: ['batchId'],
          equals: batchId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      batchId,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    console.error('Fetch batch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    );
  }
}