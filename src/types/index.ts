export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minPurchase: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Redemption {
  id: string;
  couponId: string;
  orderId: string;
  customerEmail: string | null;
  orderAmount: number;
  discountAmount: number;
  stripePaymentIntentId: string | null;
  redeemedAt: Date;
}

export interface CouponWithStats extends Coupon {
  redemptions: Redemption[];
  totalRevenue: number;
  totalDiscountGiven: number;
}

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  startsAt?: Date;
  expiresAt?: Date;
}

export interface BulkGenerateInput {
  prefix: string;
  count: number;
  discountType: DiscountType;
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  expiresAt?: Date;
}

export interface ValidateCouponInput {
  code: string;
  orderAmount: number;
}

export interface ValidateCouponResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  error?: string;
}

export interface DashboardStats {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalRevenue: number;
  totalDiscountGiven: number;
  redemptionsToday: number;
  revenueToday: number;
}

export interface RedemptionAnalytics {
  date: string;
  redemptions: number;
  revenue: number;
  discountGiven: number;
}
