import { prisma } from '@/lib/prisma';
import { CreateCouponInput } from '@/lib/validation';

export class CouponService {
  static async findAll(options?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, search, limit = 50, offset = 0 } = options || {};

    const where: Record<string, unknown> = {};

    if (status === 'active') {
      where.status = 'ACTIVE';
    } else if (status === 'inactive' || status === 'disabled') {
      where.status = 'INACTIVE';
    } else if (status === 'expired') {
      where.status = 'EXPIRED';
    } else if (status && ['ACTIVE', 'INACTIVE', 'EXPIRED', 'DEPLETED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    if (search?.trim()) {
      where.OR = [
        { code: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
        include: {
          _count: { select: { redemptions: true } },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    return { coupons, total };
  }

  static async findById(id: string) {
    return prisma.coupon.findUnique({
      where: { id },
      include: {
        redemptions: { orderBy: { redeemedAt: 'desc' }, take: 50 },
        _count: { select: { redemptions: true } },
      },
    });
  }

  static async findByCode(code: string) {
    if (!code) return null;
    return prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { _count: { select: { redemptions: true } } },
    });
  }

  static async create(data: CreateCouponInput) {
    const existing = await this.findByCode(data.code);
    if (existing) {
      throw new Error(`Coupon with code "${data.code}" already exists`);
    }

    return prisma.coupon.create({
      data: {
        code: data.code,
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minimumPurchase: data.minimumPurchase ?? null,
        maxRedemptions: data.maxRedemptions ?? null,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status ?? 'ACTIVE',
      },
    });
  }

  static async update(id: string, data: Partial<CreateCouponInput>) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Coupon not found');

    return prisma.coupon.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.discountType !== undefined && { discountType: data.discountType }),
        ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
        ...(data.minimumPurchase !== undefined && { minimumPurchase: data.minimumPurchase }),
        ...(data.maxRedemptions !== undefined && { maxRedemptions: data.maxRedemptions }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  static async delete(id: string) {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Coupon not found');
    return prisma.coupon.delete({ where: { id } });
  }

  static calculateDiscount(
    coupon: { discountType: string; discountValue: number },
    cartTotal: number
  ): number {
    let discount: number;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (cartTotal * Math.min(coupon.discountValue, 100)) / 100;
    } else {
      discount = Math.min(coupon.discountValue, cartTotal);
    }
    return Math.round(discount * 100) / 100;
  }
}
