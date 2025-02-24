import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/services/coupon.service';
import { parseNumericValue } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, orderTotal } = body;

    // Validate code
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    // Parse and validate order total
    const parsedTotal = parseNumericValue(orderTotal);
    if (parsedTotal === null || parsedTotal < 0) {
      return NextResponse.json(
        { error: 'Valid order total is required' },
        { status: 400 }
      );
    }

    const result = await CouponService.validate(code.trim(), parsedTotal);

    if (!result.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: result.error 
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: result.coupon!.id,
        code: result.coupon!.code,
        type: result.coupon!.type,
        value: result.coupon!.value,
        description: result.coupon!.description,
      },
      discount: result.discount,
      finalTotal: Math.max(0, parsedTotal - (result.discount || 0)),
    });
  } catch (error) {
    console.error('Validation error:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
