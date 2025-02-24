import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { couponService } from '@/services/coupon.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'customer.discount.created': {
        const discount = event.data.object as Stripe.Discount;
        await handleDiscountCreated(discount);
        break;
      }

      case 'promotion_code.created': {
        const promotionCode = event.data.object as Stripe.PromotionCode;
        await handlePromotionCodeCreated(promotionCode);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const couponCode = session.metadata?.coupon_code;
  
  if (!couponCode) return;

  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode },
  });

  if (!coupon) return;

  const discountAmount = session.total_details?.amount_discount 
    ? session.total_details.amount_discount / 100 
    : 0;

  await prisma.redemption.create({
    data: {
      couponId: coupon.id,
      orderAmount: (session.amount_total || 0) / 100,
      discountAmount,
      customerEmail: session.customer_email || session.customer_details?.email || undefined,
      orderId: session.id,
      metadata: {
        stripeSessionId: session.id,
        paymentStatus: session.payment_status,
      },
    },
  });

  await prisma.coupon.update({
    where: { id: coupon.id },
    data: {
      usedCount: { increment: 1 },
    },
  });

  console.log(`Coupon ${couponCode} redeemed for session ${session.id}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const couponCode = paymentIntent.metadata?.coupon_code;
  
  if (!couponCode) return;

  // Check if already processed via checkout.session.completed
  const existingRedemption = await prisma.redemption.findFirst({
    where: {
      orderId: paymentIntent.id,
    },
  });

  if (existingRedemption) return;

  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode },
  });

  if (!coupon) return;

  await prisma.redemption.create({
    data: {
      couponId: coupon.id,
      orderAmount: paymentIntent.amount / 100,
      discountAmount: 0, // Will be calculated based on coupon rules
      orderId: paymentIntent.id,
      metadata: {
        stripePaymentIntentId: paymentIntent.id,
      },
    },
  });

  await prisma.coupon.update({
    where: { id: coupon.id },
    data: {
      usedCount: { increment: 1 },
    },
  });
}

async function handleDiscountCreated(discount: Stripe.Discount) {
  console.log('Stripe discount created:', discount.id);
  // Sync Stripe discounts with local coupons if needed
}

async function handlePromotionCodeCreated(promotionCode: Stripe.PromotionCode) {
  console.log('Stripe promotion code created:', promotionCode.code);
  // Optionally sync Stripe promotion codes
}
