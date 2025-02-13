import { CouponType } from '@/types';

export interface CouponValidationInput {
  code: string;
  type: CouponType;
  value: number;
  minimumPurchase?: number | null;
  maxDiscount?: number | null;
  maxRedemptions?: number | null;
  maxRedemptionsPerCustomer?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateCouponInput(input: CouponValidationInput): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate code
  if (!input.code || typeof input.code !== 'string') {
    errors.code = 'Coupon code is required';
  } else {
    const trimmedCode = input.code.trim();
    if (trimmedCode.length < 3) {
      errors.code = 'Coupon code must be at least 3 characters';
    } else if (trimmedCode.length > 50) {
      errors.code = 'Coupon code must be less than 50 characters';
    } else if (!/^[A-Za-z0-9_-]+$/.test(trimmedCode)) {
      errors.code = 'Coupon code can only contain letters, numbers, hyphens, and underscores';
    }
  }

  // Validate type
  const validTypes: CouponType[] = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'];
  if (!input.type || !validTypes.includes(input.type)) {
    errors.type = 'Invalid coupon type';
  }

  // Validate value
  if (typeof input.value !== 'number' || isNaN(input.value)) {
    errors.value = 'Discount value is required';
  } else if (input.value < 0) {
    errors.value = 'Discount value cannot be negative';
  } else if (input.type === 'PERCENTAGE' && input.value > 100) {
    errors.value = 'Percentage discount cannot exceed 100%';
  } else if (input.type === 'FIXED_AMOUNT' && input.value > 10000) {
    errors.value = 'Fixed amount discount cannot exceed $10,000';
  }

  // Validate minimumPurchase
  if (input.minimumPurchase !== undefined && input.minimumPurchase !== null) {
    if (typeof input.minimumPurchase !== 'number' || isNaN(input.minimumPurchase)) {
      errors.minimumPurchase = 'Invalid minimum purchase amount';
    } else if (input.minimumPurchase < 0) {
      errors.minimumPurchase = 'Minimum purchase cannot be negative';
    }
  }

  // Validate maxDiscount
  if (input.maxDiscount !== undefined && input.maxDiscount !== null) {
    if (typeof input.maxDiscount !== 'number' || isNaN(input.maxDiscount)) {
      errors.maxDiscount = 'Invalid maximum discount amount';
    } else if (input.maxDiscount < 0) {
      errors.maxDiscount = 'Maximum discount cannot be negative';
    }
  }

  // Validate maxRedemptions
  if (input.maxRedemptions !== undefined && input.maxRedemptions !== null) {
    if (!Number.isInteger(input.maxRedemptions)) {
      errors.maxRedemptions = 'Maximum redemptions must be a whole number';
    } else if (input.maxRedemptions < 1) {
      errors.maxRedemptions = 'Maximum redemptions must be at least 1';
    }
  }

  // Validate maxRedemptionsPerCustomer
  if (input.maxRedemptionsPerCustomer !== undefined && input.maxRedemptionsPerCustomer !== null) {
    if (!Number.isInteger(input.maxRedemptionsPerCustomer)) {
      errors.maxRedemptionsPerCustomer = 'Per-customer limit must be a whole number';
    } else if (input.maxRedemptionsPerCustomer < 1) {
      errors.maxRedemptionsPerCustomer = 'Per-customer limit must be at least 1';
    }
  }

  // Validate date range
  if (input.startsAt && input.expiresAt) {
    const startDate = new Date(input.startsAt);
    const endDate = new Date(input.expiresAt);
    
    if (isNaN(startDate.getTime())) {
      errors.startsAt = 'Invalid start date';
    }
    if (isNaN(endDate.getTime())) {
      errors.expiresAt = 'Invalid expiration date';
    }
    if (startDate >= endDate) {
      errors.expiresAt = 'Expiration date must be after start date';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '-');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value}%`;
}

export function formatDiscountValue(type: CouponType, value: number): string {
  switch (type) {
    case 'PERCENTAGE':
      return formatPercentage(value);
    case 'FIXED_AMOUNT':
      return formatCurrency(value);
    case 'FREE_SHIPPING':
      return 'Free Shipping';
    default:
      return String(value);
  }
}
