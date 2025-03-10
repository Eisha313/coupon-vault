import { prisma } from '@/lib/prisma';
import { CreateCouponInput, UpdateCouponInput } from '@/lib/validation';
import { Coupon, CouponType } from '@/types';

export class CouponService {
  static async findAll(options?: {
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { isActive, search, limit = 50, offset = 0 } = options || {};

    const where: Record<string, unknown> = {};

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (search && search.trim()) {
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
          _count: {
            select: { redemptions: true },
          },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    return { coupons, total };
  }

  static async findById(id: string) {
    if (!id || typeof id !== 'string') {
      return null;
    }

    return prisma.coupon.findUnique({
      where: { id },
      include: {
        redemptions: {
          orderBy: { redeemedAt: 'desc' },
          take: 50,
        },
        _count: {
          select: { redemptions: true },
        },
      },
    });
  }

  static async findByCode(code: string) {
    if (!code || typeof code !== 'string') {
      return null;
    }

    const normalizedCode = code.toUpperCase().trim();
    if (!normalizedCode) {
      return null;
    }

    return prisma.coupon.findUnique({
      where: { code: normalizedCode },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });
  }

  static async create(data: CreateCouponInput) {
    const existingCoupon = await this.findByCode(data.code);
    if (existingCoupon) {
      throw new Error(`Coupon with code "${data.code}" already exists`);
    }

    return prisma.coupon.create({
      data: {
        code: data.code.toUpperCase().trim(),
        type: data.type,
        value: data.value,
        minPurchase: data.minPurchase ?? null,
        maxUses: data.maxUses ?? null,
        maxUsesPerCustomer: data.maxUsesPerCustomer ?? null,
        expiresAt: data.expiresAt ?? null,
        isActive: data.isActive ?? true,
        description: data.description ?? null,
      },
    });
  }

  static async update(id: string, data: UpdateCouponInput) {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid coupon ID');
    }

    const existingCoupon = await this.findById(id);
    if (!existingCoupon) {
      throw new Error('Coupon not found');
    }

    return prisma.coupon.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.minPurchase !== undefined && { minPurchase: data.minPurchase }),
        ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
        ...(data.maxUsesPerCustomer !== undefined && { maxUsesPerCustomer: data.maxUsesPerCustomer }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  static async delete(id: string) {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid coupon ID');
    }

    const existingCoupon = await this.findById(id);
    if (!existingCoupon) {
      throw new Error('Coupon not found');
    }

    return prisma.coupon.delete({ where: { id } });
  }

  static async validate(
    code: string,
    cartTotal: number,
    customerId?: string | null
  ): Promise<{ valid: boolean; coupon?: Coupon; error?: string; discount?: number }> {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Coupon code is required' };
    }

    if (typeof cartTotal !== 'number' || isNaN(cartTotal) || cartTotal < 0) {
      return { valid: false, error: 'Invalid cart total' };
    }

    const coupon = await this.findByCode(code);

    if (!coupon) {
      return { valid: false, error: 'Coupon not found' };
    }

    if (!coupon.isActive) {
      return { valid: false, error: 'This coupon is no longer active' };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, error: 'This coupon has expired' };
    }

    if (coupon.minPurchase !== null && cartTotal < coupon.minPurchase) {
      return {
        valid: false,
        error: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} required`,
      };
    }

    const redemptionCount = coupon._count?.redemptions ?? 0;
    if (coupon.maxUses !== null && redemptionCount >= coupon.maxUses) {
      return { valid: false, error: 'This coupon has reached its maximum usage limit' };
    }

    if (customerId && coupon.maxUsesPerCustomer !== null) {
      const customerRedemptions = await prisma.redemption.count({
        where: {
          couponId: coupon.id,
          customerId: customerId,
        },
      });

      if (customerRedemptions >= coupon.maxUsesPerCustomer) {
        return {
          valid: false,
          error: 'You have already used this coupon the maximum number of times',
        };
      }
    }

    const discount = this.calculateDiscount(coupon as Coupon, cartTotal);

    return {
      valid: true,
      coupon: coupon as Coupon,
      discount,
    };
  }

  static calculateDiscount(coupon: Coupon, cartTotal: number): number {
    if (typeof cartTotal !== 'number' || isNaN(cartTotal) || cartTotal < 0) {
      return 0;
    }

    let discount: number;

    if (coupon.type === 'PERCENTAGE') {
      discount = (cartTotal * Math.min(coupon.value, 100)) / 100;
    } else {
      discount = Math.min(coupon.value, cartTotal);
    }

    return Math.round(discount * 100) / 100;
  }

  static async recordRedemption(
    couponId: string,
    orderId: string,
    customerId: string | null,
    discountAmount: number,
    orderTotal: number
  ) {
    if (!couponId || !orderId) {
      throw new Error('Coupon ID and Order ID are required');
    }

    if (typeof discountAmount !== 'number' || isNaN(discountAmount)) {
      throw new Error('Invalid discount amount');
    }

    if (typeof orderTotal !== 'number' || isNaN(orderTotal)) {
      throw new Error('Invalid order total');
    }

    return prisma.redemption.create({
      data: {
        couponId,
        orderId,
        customerId: customerId || null,
        discountAmount: Math.abs(discountAmount),
        orderTotal: Math.abs(orderTotal),
      },
    });
  }

  static async getAnalytics(couponId?: string) {
    const where = couponId ? { couponId } : {};

    const [totalRedemptions, totalDiscount, totalRevenue, recentRedemptions] =
      await Promise.all([
        prisma.redemption.count({ where }),
        prisma.redemption.aggregate({
          where,
          _sum: { discountAmount: true },
        }),
        prisma.redemption.aggregate({
          where,
          _sum: { orderTotal: true },
        }),
        prisma.redemption.findMany({
          where,
          orderBy: { redeemedAt: 'desc' },
          take: 10,
          include: {
            coupon: {
              select: { code: true, type: true, value: true },
            },
          },
        }),
      ]);

    return {
      totalRedemptions,
      totalDiscount: totalDiscount._sum.discountAmount ?? 0,
      totalRevenue: totalRevenue._sum.orderTotal ?? 0,
      recentRedemptions,
    };
  }
}
