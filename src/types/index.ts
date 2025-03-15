export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'DEPLETED';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumPurchase: number | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
  startDate: string;
  endDate: string | null;
  status: CouponStatus;
  stripePromotionId: string | null;
  stripeCouponId: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  _count?: { redemptions: number };
}

export interface Redemption {
  id: string;
  couponId: string;
  orderId: string | null;
  customerEmail: string | null;
  discountApplied: number;
  orderTotal: number | null;
  stripePaymentId: string | null;
  metadata: unknown;
  redeemedAt: string;
  coupon?: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
  };
}

export interface TopCoupon {
  id: string;
  code: string;
  redemptionCount: number;
  totalDiscount: number;
  isActive: boolean;
}
