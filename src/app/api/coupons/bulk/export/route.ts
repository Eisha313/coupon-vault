import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const format = searchParams.get('format') || 'csv';

    let whereClause = {};
    
    if (batchId) {
      whereClause = {
        metadata: {
          path: ['batchId'],
          equals: batchId,
        },
      };
    }

    const coupons = await prisma.coupon.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    if (coupons.length === 0) {
      return NextResponse.json(
        { error: 'No coupons found' },
        { status: 404 }
      );
    }

    if (format === 'json') {
      return NextResponse.json(coupons, {
        headers: {
          'Content-Disposition': `attachment; filename="coupons-${batchId || 'all'}.json"`,
        },
      });
    }

    // Default to CSV format
    const csvHeaders = [
      'Code',
      'Discount Type',
      'Discount Value',
      'Min Purchase',
      'Max Uses',
      'Usage Count',
      'Expires At',
      'Active',
      'Created At',
    ].join(',');

    const csvRows = coupons.map(coupon => [
      coupon.code,
      coupon.discountType,
      coupon.discountValue,
      coupon.minPurchaseAmount || '',
      coupon.maxUses || 'Unlimited',
      coupon.usageCount,
      coupon.expiresAt ? new Date(coupon.expiresAt).toISOString() : 'Never',
      coupon.isActive ? 'Yes' : 'No',
      new Date(coupon.createdAt).toISOString(),
    ].join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="coupons-${batchId || 'all'}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export coupons' },
      { status: 500 }
    );
  }
}