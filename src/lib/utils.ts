import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function generateCouponCode(prefix: string = '', length: number = 8): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix ? `${prefix.toUpperCase()}-` : '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

export function calculateDiscount(
  subtotal: number,
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT',
  discountValue: number,
  maxDiscount?: number | null
): number {
  let discount = 0;
  
  if (discountType === 'PERCENTAGE') {
    discount = Math.floor(subtotal * (discountValue / 100));
  } else {
    discount = discountValue;
  }
  
  if (maxDiscount && discount > maxDiscount) {
    discount = maxDiscount;
  }
  
  return Math.min(discount, subtotal);
}

export function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry < new Date();
}
