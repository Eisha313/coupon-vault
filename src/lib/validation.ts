import { z } from 'zod';

export const couponCodeSchema = z
  .string()
  .min(3, 'Coupon code must be at least 3 characters')
  .max(50, 'Coupon code must not exceed 50 characters')
  .regex(/^[A-Za-z0-9_-]+$/, 'Coupon code can only contain letters, numbers, underscores, and hyphens')
  .transform((val) => val.trim().toUpperCase());

export const discountTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);

export const createCouponSchema = z.object({
  code: couponCodeSchema,
  description: z.string().max(500).optional().nullable(),
  discountType: discountTypeSchema,
  discountValue: z.number().positive('Discount value must be positive'),
  minPurchaseAmount: z.number().nonnegative().optional().nullable(),
  maxDiscountAmount: z.number().positive().optional().nullable(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  maxRedemptionsPerCustomer: z.number().int().positive().optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional().default(true)
}).refine(
  (data) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] }
).refine(
  (data) => {
    if (data.startsAt && data.expiresAt && data.startsAt >= data.expiresAt) {
      return false;
    }
    return true;
  },
  { message: 'Start date must be before expiration date', path: ['expiresAt'] }
);

export const updateCouponSchema = createCouponSchema.partial().extend({
  id: z.string().uuid('Invalid coupon ID')
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  cartTotal: z.number().nonnegative('Cart total must be non-negative').optional(),
  customerId: z.string().optional()
});

export const bulkGenerateSchema = z.object({
  prefix: z.string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(10, 'Prefix must not exceed 10 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Prefix can only contain letters and numbers')
    .transform((val) => val.toUpperCase()),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Cannot generate more than 1000 codes at once'),
  discountType: discountTypeSchema,
  discountValue: z.number().positive('Discount value must be positive'),
  minPurchaseAmount: z.number().nonnegative().optional().nullable(),
  maxDiscountAmount: z.number().positive().optional().nullable(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  maxRedemptionsPerCustomer: z.number().int().positive().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  codeLength: z.number().int().min(4).max(12).optional().default(8)
}).refine(
  (data) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] }
);

export const emailCaptureSchema = z.object({
  email: z.string().email('Invalid email address'),
  couponCode: couponCodeSchema,
  source: z.string().optional().default('share_page')
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export const couponFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  discountType: discountTypeSchema.optional()
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type BulkGenerateInput = z.infer<typeof bulkGenerateSchema>;
export type EmailCaptureInput = z.infer<typeof emailCaptureSchema>;
export type CouponFilterInput = z.infer<typeof couponFilterSchema>;

// Helper function to safely parse and return errors
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
  
  return { success: false, errors };
}
