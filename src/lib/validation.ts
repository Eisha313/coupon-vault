import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Code can only contain letters, numbers, underscores, and hyphens')
    .transform((val) => val.toUpperCase().trim()),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .nullable()
    .transform((val) => val?.trim() || null),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT'], {
    required_error: 'Discount type is required',
  }),
  discountValue: z
    .number({ required_error: 'Discount value is required' })
    .positive('Value must be positive'),
  minimumPurchase: z
    .number()
    .min(0, 'Minimum purchase cannot be negative')
    .optional()
    .nullable()
    .transform((val) => val ?? null),
  maxRedemptions: z
    .number()
    .int('Max redemptions must be a whole number')
    .positive('Max redemptions must be positive')
    .optional()
    .nullable()
    .transform((val) => val ?? null),
  startDate: z
    .string()
    .optional()
    .transform((val) => val || new Date().toISOString()),
  endDate: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
}).refine(
  (data) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      return false;
    }
    return true;
  },
  { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] }
);

export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export function formatValidationErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }
  return errors;
}
