import { nanoid } from 'nanoid';

export interface BulkGenerationOptions {
  count: number;
  prefix?: string;
  length?: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minPurchaseAmount?: number;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface GeneratedCoupon {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minPurchaseAmount: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number;
  expiresAt: Date | null;
  metadata: Record<string, unknown>;
}

function generateUniqueCode(prefix: string, length: number): string {
  const randomPart = nanoid(length).toUpperCase();
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}

export function generateBulkCoupons(options: BulkGenerationOptions): GeneratedCoupon[] {
  const {
    count,
    prefix = '',
    length = 8,
    discountType,
    discountValue,
    minPurchaseAmount,
    maxUses,
    maxUsesPerCustomer = 1,
    expiresAt,
    metadata = {},
  } = options;

  if (count < 1 || count > 10000) {
    throw new Error('Count must be between 1 and 10000');
  }

  if (length < 4 || length > 20) {
    throw new Error('Code length must be between 4 and 20 characters');
  }

  if (discountType === 'PERCENTAGE' && (discountValue < 1 || discountValue > 100)) {
    throw new Error('Percentage discount must be between 1 and 100');
  }

  if (discountType === 'FIXED_AMOUNT' && discountValue < 0.01) {
    throw new Error('Fixed amount discount must be at least 0.01');
  }

  const generatedCodes = new Set<string>();
  const coupons: GeneratedCoupon[] = [];

  while (coupons.length < count) {
    const code = generateUniqueCode(prefix, length);
    
    if (!generatedCodes.has(code)) {
      generatedCodes.add(code);
      coupons.push({
        code,
        discountType,
        discountValue,
        minPurchaseAmount: minPurchaseAmount ?? null,
        maxUses: maxUses ?? null,
        maxUsesPerCustomer,
        expiresAt: expiresAt ?? null,
        metadata: {
          ...metadata,
          bulkGenerated: true,
          batchId: nanoid(12),
        },
      });
    }
  }

  return coupons;
}

export function validateBulkOptions(options: Partial<BulkGenerationOptions>): string[] {
  const errors: string[] = [];

  if (!options.count || options.count < 1) {
    errors.push('Count is required and must be at least 1');
  }

  if (options.count && options.count > 10000) {
    errors.push('Count cannot exceed 10000');
  }

  if (!options.discountType) {
    errors.push('Discount type is required');
  }

  if (options.discountValue === undefined || options.discountValue === null) {
    errors.push('Discount value is required');
  }

  if (options.prefix && options.prefix.length > 10) {
    errors.push('Prefix cannot exceed 10 characters');
  }

  if (options.prefix && !/^[A-Z0-9]*$/i.test(options.prefix)) {
    errors.push('Prefix can only contain letters and numbers');
  }

  if (options.expiresAt && new Date(options.expiresAt) <= new Date()) {
    errors.push('Expiration date must be in the future');
  }

  return errors;
}