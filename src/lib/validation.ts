import { z } from 'zod';

export const CouponType = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Code can only contain letters, numbers, underscores, and hyphens')
    .transform((val) => val.toUpperCase().trim()),
  type: CouponType,
  value: z
    .number()
    .positive('Value must be positive')
    .refine((val) => !isNaN(val), 'Value must be a valid number'),
  minPurchase: z
    .number()
    .min(0, 'Minimum purchase cannot be negative')
    .optional()
    .nullable()
    .transform((val) => val ?? null),
  maxUses: z
    .number()
    .int('Max uses must be a whole number')
    .positive('Max uses must be positive')
    .optional()
    .nullable()
    .transform((val) => val ?? null),
  maxUsesPerCustomer: z
    .number()
    .int('Max uses per customer must be a whole number')
    .positive('Max uses per customer must be positive')
    .optional()
    .nullable()
    .transform((val) => val ?? null),
  expiresAt: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const date = new Date(val);
      if (isNaN(date.getTime())) return null;
      return date;
    }),
  isActive: z.boolean().default(true),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
}).refine(
  (data) => {
    if (data.type === 'PERCENTAGE' && data.value > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['value'],
  }
).refine(
  (data) => {
    if (data.expiresAt && data.expiresAt < new Date()) {
      return false;
    }
    return true;
  },
  {
    message: 'Expiration date cannot be in the past',
    path: ['expiresAt'],
  }
);

export const updateCouponSchema = createCouponSchema.partial().omit({ code: true });

export const validateCouponSchema = z.object({
  code: z
    .string()
    .min(1, 'Coupon code is required')
    .transform((val) => val.toUpperCase().trim()),
  cartTotal: z
    .number()
    .min(0, 'Cart total cannot be negative')
    .refine((val) => !isNaN(val), 'Cart total must be a valid number'),
  customerId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

export const bulkGenerateSchema = z.object({
  prefix: z
    .string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(20, 'Prefix must be at most 20 characters')
    .regex(/^[A-Z0-9]+$/i, 'Prefix can only contain letters and numbers')
    .transform((val) => val.toUpperCase().trim()),
  count: z
    .number()
    .int('Count must be a whole number')
    .min(1, 'Must generate at least 1 coupon')
    .max(1000, 'Cannot generate more than 1000 coupons at once'),
  type: CouponType,
  value: z
    .number()
    .positive('Value must be positive')
    .refine((val) => !isNaN(val), 'Value must be a valid number'),
  minPurchase: z
    .number()
    .min(0, 'Minimum purchase cannot be negative')
    .optional()
    .nullable()
    .transform((val) => val ?? null),
  maxUsesPerCode: z
    .number()
    .int('Max uses per code must be a whole number')
    .positive('Max uses per code must be positive')
    .optional()
    .nullable()
    .transform((val) => val ?? null),
  expiresAt: z
    .string()
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const date = new Date(val);
      if (isNaN(date.getTime())) return null;
      return date;
    }),
  suffixLength: z
    .number()
    .int('Suffix length must be a whole number')
    .min(4, 'Suffix must be at least 4 characters')
    .max(12, 'Suffix must be at most 12 characters')
    .default(8),
}).refine(
  (data) => {
    if (data.type === 'PERCENTAGE' && data.value > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['value'],
  }
).refine(
  (data) => {
    if (data.expiresAt && data.expiresAt < new Date()) {
      return false;
    }
    return true;
  },
  {
    message: 'Expiration date cannot be in the past',
    path: ['expiresAt'],
  }
);

export const emailCaptureSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be at most 255 characters')
    .transform((val) => val.toLowerCase().trim()),
  couponCode: z
    .string()
    .min(1, 'Coupon code is required')
    .transform((val) => val.toUpperCase().trim()),
  name: z
    .string()
    .max(100, 'Name must be at most 100 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type BulkGenerateInput = z.infer<typeof bulkGenerateSchema>;
export type EmailCaptureInput = z.infer<typeof emailCaptureSchema>;

export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

export function safeParseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}
