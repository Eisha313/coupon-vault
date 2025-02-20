import { prisma } from '@/lib/prisma';
import { Coupon, CouponType, CouponStatus } from '@/types';
import { validateCouponInput, ValidationResult } from '@/lib/validation';
import { generateBulkCodes, BulkGenerationOptions } from '@/lib/bulk-generator';

export interface CreateCouponInput {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minPurchase?: number;
  maxUses?: number;
  expiresAt?: Date;
}

export interface UpdateCouponInput {
  description?: string;
  type?: CouponType;
  value?: number;
  minPurchase?: number;
  maxUses?: number;
  expiresAt?: Date;
  status?: CouponStatus;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  error?: string;
  discount?: number;
}

export class CouponService {
  async findAll(options?: {
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
        include: {
          _count: {
            select: { redemptions: true },
          },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    return { coupons: coupons as unknown as Coupon[], total };
  }

  async findById(id: string): Promise<Coupon | null> {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        redemptions: {
          take: 10,
          orderBy: { redeemedAt: 'desc' },
        },
        _count: {
          select: { redemptions: true },
        },
      },
    });

    return coupon as unknown as Coupon | null;
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    return coupon as unknown as Coupon | null;
  }

  async create(input: CreateCouponInput): Promise<{ coupon?: Coupon; error?: string }> {
    const validation = validateCouponInput(input);
    if (!validation.valid) {
      return { error: validation.errors.join(', ') };
    }

    const existingCoupon = await this.findByCode(input.code);
    if (existingCoupon) {
      return { error: 'A coupon with this code already exists' };
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: input.code.toUpperCase(),
        description: input.description,
        type: input.type,
        value: input.value,
        minPurchase: input.minPurchase,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt,
        status: 'ACTIVE',
      },
    });

    return { coupon: coupon as unknown as Coupon };
  }

  async update(id: string, input: UpdateCouponInput): Promise<{ coupon?: Coupon; error?: string }> {
    const existingCoupon = await this.findById(id);
    if (!existingCoupon) {
      return { error: 'Coupon not found' };
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: input,
    });

    return { coupon: coupon as unknown as Coupon };
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const existingCoupon = await this.findById(id);
    if (!existingCoupon) {
      return { success: false, error: 'Coupon not found' };
    }

    await prisma.coupon.delete({ where: { id } });
    return { success: true };
  }

  async validate(code: string, orderTotal: number): Promise<CouponValidationResult> {
    const coupon = await this.findByCode(code);

    if (!coupon) {
      return { valid: false, error: 'Coupon not found' };
    }

    if (coupon.status !== 'ACTIVE') {
      return { valid: false, error: 'Coupon is not active' };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, error: 'Coupon has expired' };
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: 'Coupon usage limit reached' };
    }

    if (coupon.minPurchase && orderTotal < coupon.minPurchase) {
      return {
        valid: false,
        error: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} required`,
      };
    }

    const discount = this.calculateDiscount(coupon, orderTotal);

    return { valid: true, coupon, discount };
  }

  calculateDiscount(coupon: Coupon, orderTotal: number): number {
    if (coupon.type === 'PERCENTAGE') {
      return Math.round(orderTotal * (coupon.value / 100) * 100) / 100;
    }
    return Math.min(coupon.value, orderTotal);
  }

  async recordRedemption(
    couponId: string,
    orderId: string,
    customerId?: string,
    discountAmount?: number
  ): Promise<void> {
    await prisma.$transaction([
      prisma.redemption.create({
        data: {
          couponId,
          orderId,
          customerId,
          discountAmount,
        },
      }),
      prisma.coupon.update({
        where: { id: couponId },
        data: {
          usedCount: { increment: 1 },
        },
      }),
    ]);
  }

  async createBulk(
    options: BulkGenerationOptions
  ): Promise<{ coupons: Coupon[]; codes: string[] }> {
    const codes = generateBulkCodes(options);

    const coupons = await prisma.$transaction(
      codes.map((code) =>
        prisma.coupon.create({
          data: {
            code,
            description: options.description,
            type: options.type,
            value: options.value,
            minPurchase: options.minPurchase,
            maxUses: options.maxUsesPerCode,
            expiresAt: options.expiresAt,
            status: 'ACTIVE',
          },
        })
      )
    );

    return { coupons: coupons as unknown as Coupon[], codes };
  }
}

export const couponService = new CouponService();