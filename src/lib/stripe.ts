import Stripe from 'stripe';
import { prisma } from './prisma';
import { Coupon, DiscountType } from '@/types';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createStripeCoupon(coupon: Coupon): Promise<Stripe.Coupon> {
  const stripeCouponData: Stripe.CouponCreateParams = {
    id: coupon.code,
    name: coupon.description || coupon.code,
    metadata: {
      coupon_vault_id: coupon.id,
    },
  };

  if (coupon.discountType === DiscountType.PERCENTAGE) {
    stripeCouponData.percent_off = coupon.discountValue;
  } else {
    stripeCouponData.amount_off = Math.round(coupon.discountValue * 100);
    stripeCouponData.currency = 'usd';
  }

  if (coupon.maxUses) {
    stripeCouponData.max_redemptions = coupon.maxUses;
  }

  if (coupon.expiresAt) {
    stripeCouponData.redeem_by = Math.floor(new Date(coupon.expiresAt).getTime() / 1000);
  }

  return stripe.coupons.create(stripeCouponData);
}

export async function createStripePromotionCode(
  coupon: Coupon,
  stripeCouponId: string
): Promise<Stripe.PromotionCode> {
  const promotionCodeData: Stripe.PromotionCodeCreateParams = {
    coupon: stripeCouponId,
    code: coupon.code,
    metadata: {
      coupon_vault_id: coupon.id,
    },
  };

  if (coupon.minPurchase && coupon.minPurchase > 0) {
    promotionCodeData.restrictions = {
      minimum_amount: Math.round(coupon.minPurchase * 100),
      minimum_amount_currency: 'usd',
    };
  }

  return stripe.promotionCodes.create(promotionCodeData);
}

export async function syncCouponToStripe(couponId: string): Promise<void> {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon) {
    throw new Error('Coupon not found');
  }

  try {
    // Check if Stripe coupon already exists
    try {
      await stripe.coupons.retrieve(coupon.code);
      // If it exists, update it
      await stripe.coupons.update(coupon.code, {
        name: coupon.description || coupon.code,
        metadata: {
          coupon_vault_id: coupon.id,
        },
      });
    } catch {
      // Coupon doesn't exist, create it
      await createStripeCoupon(coupon as unknown as Coupon);
    }

    // Update the coupon with Stripe sync status
    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        metadata: {
          ...((coupon.metadata as object) || {}),
          stripeSynced: true,
          stripeSyncedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Failed to sync coupon to Stripe:', error);
    throw error;
  }
}

export async function deleteStripeCoupon(code: string): Promise<void> {
  try {
    await stripe.coupons.del(code);
  } catch (error) {
    // Ignore if coupon doesn't exist in Stripe
    console.log('Stripe coupon not found or already deleted:', code);
  }
}

export async function validateCouponWithStripe(
  code: string,
  amount: number
): Promise<{ valid: boolean; discount: number; error?: string }> {
  try {
    const promotionCodes = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      return { valid: false, discount: 0, error: 'Invalid promotion code' };
    }

    const promotionCode = promotionCodes.data[0];
    const stripeCoupon = await stripe.coupons.retrieve(promotionCode.coupon.id);

    // Check minimum amount
    if (promotionCode.restrictions?.minimum_amount) {
      const minAmount = promotionCode.restrictions.minimum_amount / 100;
      if (amount < minAmount) {
        return {
          valid: false,
          discount: 0,
          error: `Minimum purchase of $${minAmount} required`,
        };
      }
    }

    // Calculate discount
    let discount = 0;
    if (stripeCoupon.percent_off) {
      discount = (amount * stripeCoupon.percent_off) / 100;
    } else if (stripeCoupon.amount_off) {
      discount = Math.min(stripeCoupon.amount_off / 100, amount);
    }

    return { valid: true, discount };
  } catch (error) {
    console.error('Stripe validation error:', error);
    return { valid: false, discount: 0, error: 'Validation failed' };
  }
}

export async function createCheckoutSession(
  items: { price: string; quantity: number }[],
  couponCode?: string
): Promise<Stripe.Checkout.Session> {
  const sessionData: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: items,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
  };

  if (couponCode) {
    const promotionCodes = await stripe.promotionCodes.list({
      code: couponCode,
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length > 0) {
      sessionData.discounts = [{ promotion_code: promotionCodes.data[0].id }];
      sessionData.metadata = { coupon_code: couponCode };
    }
  }

  return stripe.checkout.sessions.create(sessionData);
}
