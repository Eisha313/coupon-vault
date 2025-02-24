import { prisma } from '@/lib/prisma';
import { Coupon, CouponType, CouponStatus } from '@/types';
import { validateCouponInput } from '@/lib/validation';

export class CouponService {
  static async findAll(options?: {
    status?: CouponStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ coupons: Coupon[]; total: number }> {
    const where = options?.status ? { status: options.status } : {};
    
    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coupon.count({ where }),
    ]);

    return { coupons: coupons as Coupon[], total };
  }

  static async findById(id: string): Promise<Coupon | null> {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    return coupon as Coupon | null;
  }

  static async findByCode(code: string): Promise<Coupon | null> {
    if (!code || typeof code !== 'string') {
      return null;
    }

    const normalizedCode = code.trim().toUpperCase();
    
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    return coupon as Coupon | null;
  }

  static async create(data: {
    code: string;
    type: CouponType;
    value: number;
    minPurchase?: number;
    maxUses?: number;
    expiresAt?: Date;
    description?: string;
  }): Promise<Coupon> {
    const validation = validateCouponInput(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const normalizedCode = data.code.trim().toUpperCase();

    // Check for existing coupon with same code
    const existing = await this.findByCode(normalizedCode);
    if (existing) {
      throw new Error(`Coupon code '${normalizedCode}' already exists`);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        type: data.type,
        value: data.value,
        minPurchase: data.minPurchase ?? 0,
        maxUses: data.maxUses ?? null,
        usedCount: 0,
        expiresAt: data.expiresAt ?? null,
        description: data.description ?? null,
        status: 'active',
      },
    });

    return coupon as Coupon;
  }

  static async update(
    id: string,
    data: Partial<{
      code: string;
      type: CouponType;
      value: number;
      minPurchase: number;
      maxUses: number | null;
      expiresAt: Date | null;
      description: string | null;
      status: CouponStatus;
    }>
  ): Promise<Coupon> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Coupon with id '${id}' not found`);
    }

    // Normalize code if provided
    const updateData = { ...data };
    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
      
      // Check if new code conflicts with another coupon
      if (updateData.code !== existing.code) {
        const codeExists = await this.findByCode(updateData.code);
        if (codeExists) {
          throw new Error(`Coupon code '${updateData.code}' already exists`);
        }
      }
    }

    // Validate value if type or value changes
    if (updateData.type || updateData.value !== undefined) {
      const type = updateData.type || existing.type;
      const value = updateData.value ?? existing.value;
      
      if (type === 'percentage' && (value < 0 || value > 100)) {
        throw new Error('Percentage discount must be between 0 and 100');
      }
      if (type === 'fixed' && value < 0) {
        throw new Error('Fixed discount cannot be negative');
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    return coupon as Coupon;
  }

  static async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Coupon with id '${id}' not found`);
    }

    // Soft delete by setting status to expired
    await prisma.coupon.update({
      where: { id },
      data: { status: 'expired' },
    });
  }

  static async hardDelete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Coupon with id '${id}' not found`);
    }

    // Delete related redemptions first
    await prisma.redemption.deleteMany({
      where: { couponId: id },
    });

    await prisma.coupon.delete({
      where: { id },
    });
  }

  static async validate(
    code: string,
    orderTotal: number
  ): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discount?: number;
    error?: string;
  }> {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Coupon code is required' };
    }

    if (typeof orderTotal !== 'number' || isNaN(orderTotal) || orderTotal < 0) {
      return { valid: false, error: 'Valid order total is required' };
    }

    const coupon = await this.findByCode(code);

    if (!coupon) {
      return { valid: false, error: 'Coupon not found' };
    }

    if (coupon.status !== 'active') {
      return { valid: false, error: 'Coupon is not active' };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      // Auto-expire the coupon
      await this.update(coupon.id, { status: 'expired' });
      return { valid: false, error: 'Coupon has expired' };
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: 'Coupon usage limit reached' };
    }

    if (coupon.minPurchase && orderTotal < coupon.minPurchase) {
      return {
        valid: false,
        error: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} required`,
      };
    }

    let discount: number;
    if (coupon.type === 'percentage') {
      discount = Math.round((orderTotal * coupon.value) / 100 * 100) / 100;
    } else {
      discount = Math.min(coupon.value, orderTotal);
    }

    // Ensure discount doesn't exceed order total
    discount = Math.min(discount, orderTotal);

    return {
      valid: true,
      coupon,
      discount,
    };
  }

  static async redeem(
    code: string,
    orderTotal: number,
    orderId: string,
    customerEmail?: string
  ): Promise<{
    success: boolean;
    discount?: number;
    error?: string;
  }> {
    const validation = await this.validate(code, orderTotal);

    if (!validation.valid || !validation.coupon) {
      return { success: false, error: validation.error };
    }

    const coupon = validation.coupon;

    try {
      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Increment usage count
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });

        // Create redemption record
        await tx.redemption.create({
          data: {
            couponId: coupon.id,
            orderId,
            orderTotal,
            discountAmount: validation.discount!,
            customerEmail: customerEmail ?? null,
          },
        });
      });

      return {
        success: true,
        discount: validation.discount,
      };
    } catch (error) {
      console.error('Redemption error:', error);
      return {
        success: false,
        error: 'Failed to process redemption',
      };
    }
  }

  static async getStats(): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    totalRedemptions: number;
    totalDiscountGiven: number;
    averageDiscount: number;
  }> {
    const [totalCoupons, activeCoupons, redemptionStats] = await Promise.all([
      prisma.coupon.count(),
      prisma.coupon.count({ where: { status: 'active' } }),
      prisma.redemption.aggregate({
        _count: true,
        _sum: { discountAmount: true },
        _avg: { discountAmount: true },
      }),
    ]);

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions: redemptionStats._count ?? 0,
      totalDiscountGiven: redemptionStats._sum.discountAmount ?? 0,
      averageDiscount: redemptionStats._avg.discountAmount ?? 0,
    };
  }
}
