import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const redemptions = await prisma.redemption.findMany({
      take: 15,
      orderBy: { redeemedAt: 'desc' },
      include: {
        coupon: {
          select: { code: true, discountType: true, discountValue: true },
        },
      },
    });
    return NextResponse.json(redemptions);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json([], { status: 200 });
  }
}
