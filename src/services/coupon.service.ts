import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  maxRedemptions?: number;
  maxRedemptionsPerCustomer?: number;
  startsAt?: Date;
  expiresAt?: Date;
  isActive?: boolean;
}

export interface UpdateCouponInput extends Partial<CreateCouponInput> {
  id: string;
}

export class CouponService {
  static async create(input: CreateCouponInput) {
    // Normalize code to uppercase and trim
    const normalizedCode = input.code.trim().toUpperCase();
    
    // Validate code format
    if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
      throw new Error('Coupon code can only contain letters, numbers, underscores, and hyphens');
    }

    if (normalizedCode.length < 3 || normalizedCode.length > 50) {
      throw new Error('Coupon code must be between 3 and 50 characters');
    }

    // Validate discount value
    if (input.discountValue <= 0) {
      throw new Error('Discount value must be greater than 0');
    }

    if (input.discountType === 'PERCENTAGE' && input.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    // Validate dates
    if (input.startsAt && input.expiresAt && input.startsAt >= input.expiresAt) {
      throw new Error('Start date must be before expiration date');
    }

    // Check for duplicate code
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode }
    });

    if (existingCoupon) {
      throw new Error('A coupon with this code already exists');
    }

    return prisma.coupon.create({
      data: {
        ...input,
        code: normalizedCode,
        minPurchaseAmount: input.minPurchaseAmount ?? null,
        maxDiscountAmount: input.maxDiscountAmount ?? null,
        maxRedemptions: input.maxRedemptions ?? null,
        maxRedemptionsPerCustomer: input.maxRedemptionsPerCustomer ?? null,
        isActive: input.isActive ?? true
      }
    });
  }

  static async update(input: UpdateCouponInput) {
    const { id, ...data } = input;

    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!existingCoupon) {
      throw new Error('Coupon not found');
    }

    // If updating code, validate and check for duplicates
    if (data.code) {
      const normalizedCode = data.code.trim().toUpperCase();
      
      if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
        throw new Error('Coupon code can only contain letters, numbers, underscores, and hyphens');
      }

      if (normalizedCode !== existingCoupon.code) {
        const duplicateCoupon = await prisma.coupon.findUnique({
          where: { code: normalizedCode }
        });

        if (duplicateCoupon) {
          throw new Error('A coupon with this code already exists');
        }
      }

      data.code = normalizedCode;
    }

    // Validate discount value if provided
    if (data.discountValue !== undefined && data.discountValue <= 0) {
      throw new Error('Discount value must be greater than 0');
    }

    const discountType = data.discountType ?? existingCoupon.discountType;
    const discountValue = data.discountValue ?? existingCoupon.discountValue;

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    // Validate dates
    const startsAt = data.startsAt ?? existingCoupon.startsAt;
    const expiresAt = data.expiresAt ?? existingCoupon.expiresAt;

    if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
      throw new Error('Start date must be before expiration date');
    }

    return prisma.coupon.update({
      where: { id },
      data
    });
  }

  static async delete(id: string) {
    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id },
      include: { redemptions: { take: 1 } }
    });

    if (!existingCoupon) {
      throw new Error('Coupon not found');
    }

    // Soft delete if coupon has redemptions
    if (existingCoupon.redemptions.length > 0) {
      return prisma.coupon.update({
        where: { id },
        data: { isActive: false }
      });
    }

    // Hard delete if no redemptions
    return prisma.coupon.delete({
      where: { id }
    });
  }

  static async getById(id: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        redemptions: {
          take: 100,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { redemptions: true }
        }
      }
    });

    if (!coupon) {
      throw new Error('Coupon not found');
    }

    return coupon;
  }

  static async list(options: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  } = {}) {
    const { page = 1, limit = 20, search, isActive, discountType } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (discountType) {
      where.discountType = discountType;
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { redemptions: true }
          }
        }
      }),
      prisma.coupon.count({ where })
    ]);

    return {
      coupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async recordRedemption(couponId: string, data: {
    orderId?: string;
    customerId?: string;
    customerEmail?: string;
    orderTotal: number;
    discountAmount: number;
  }) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId }
    });

    if (!coupon) {
      throw new Error('Coupon not found');
    }

    if (!coupon.isActive) {
      throw new Error('Coupon is not active');
    }

    // Use transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      // Create redemption record
      const redemption = await tx.redemption.create({
        data: {
          couponId,
          orderId: data.orderId ?? null,
          customerId: data.customerId ?? null,
          customerEmail: data.customerEmail ?? null,
          orderTotal: data.orderTotal,
          discountAmount: data.discountAmount
        }
      });

      // Increment coupon redemption count
      await tx.coupon.update({
        where: { id: couponId },
        data: {
          currentRedemptions: { increment: 1 },
          totalRevenue: { increment: data.orderTotal },
          totalDiscount: { increment: data.discountAmount }
        }
      });

      return redemption;
    });
  }
}
