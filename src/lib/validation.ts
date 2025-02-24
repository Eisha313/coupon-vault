import { CouponType } from '@/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCouponInput(data: {
  code?: string;
  type?: CouponType;
  value?: number;
  minPurchase?: number;
  maxUses?: number;
  expiresAt?: Date | string;
}): ValidationResult {
  const errors: string[] = [];

  // Code validation
  if (!data.code) {
    errors.push('Coupon code is required');
  } else if (typeof data.code !== 'string') {
    errors.push('Coupon code must be a string');
  } else {
    const trimmedCode = data.code.trim();
    if (trimmedCode.length < 3) {
      errors.push('Coupon code must be at least 3 characters');
    }
    if (trimmedCode.length > 50) {
      errors.push('Coupon code must be at most 50 characters');
    }
    if (!/^[A-Za-z0-9_-]+$/.test(trimmedCode)) {
      errors.push('Coupon code can only contain letters, numbers, hyphens, and underscores');
    }
  }

  // Type validation
  if (!data.type) {
    errors.push('Coupon type is required');
  } else if (!['percentage', 'fixed'].includes(data.type)) {
    errors.push('Coupon type must be "percentage" or "fixed"');
  }

  // Value validation
  if (data.value === undefined || data.value === null) {
    errors.push('Coupon value is required');
  } else if (typeof data.value !== 'number' || isNaN(data.value)) {
    errors.push('Coupon value must be a valid number');
  } else if (data.value < 0) {
    errors.push('Coupon value cannot be negative');
  } else if (data.type === 'percentage') {
    if (data.value > 100) {
      errors.push('Percentage discount cannot exceed 100%');
    }
    if (data.value === 0) {
      errors.push('Percentage discount must be greater than 0');
    }
  } else if (data.type === 'fixed') {
    if (data.value === 0) {
      errors.push('Fixed discount must be greater than 0');
    }
    if (data.value > 10000) {
      errors.push('Fixed discount cannot exceed $10,000');
    }
  }

  // Min purchase validation
  if (data.minPurchase !== undefined && data.minPurchase !== null) {
    if (typeof data.minPurchase !== 'number' || isNaN(data.minPurchase)) {
      errors.push('Minimum purchase must be a valid number');
    } else if (data.minPurchase < 0) {
      errors.push('Minimum purchase cannot be negative');
    }
  }

  // Max uses validation
  if (data.maxUses !== undefined && data.maxUses !== null) {
    if (typeof data.maxUses !== 'number' || isNaN(data.maxUses)) {
      errors.push('Maximum uses must be a valid number');
    } else if (!Number.isInteger(data.maxUses)) {
      errors.push('Maximum uses must be a whole number');
    } else if (data.maxUses < 1) {
      errors.push('Maximum uses must be at least 1');
    }
  }

  // Expiration date validation
  if (data.expiresAt !== undefined && data.expiresAt !== null) {
    let expirationDate: Date;
    
    if (data.expiresAt instanceof Date) {
      expirationDate = data.expiresAt;
    } else if (typeof data.expiresAt === 'string') {
      expirationDate = new Date(data.expiresAt);
    } else {
      errors.push('Expiration date must be a valid date');
      return { valid: errors.length === 0, errors };
    }

    if (isNaN(expirationDate.getTime())) {
      errors.push('Expiration date must be a valid date');
    } else if (expirationDate <= new Date()) {
      errors.push('Expiration date must be in the future');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validateOrderId(orderId: string): boolean {
  if (!orderId || typeof orderId !== 'string') {
    return false;
  }
  
  const trimmed = orderId.trim();
  return trimmed.length >= 1 && trimmed.length <= 255;
}

export function sanitizeCode(code: string): string {
  if (!code || typeof code !== 'string') {
    return '';
  }
  
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

export function parseNumericValue(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  
  if (isNaN(parsed)) {
    return null;
  }
  
  return parsed;
}
