# Coupon Vault

A lightweight discount code management system for small e-commerce stores. Helps business owners create, organize, and track promotional discount codes with usage analytics and Stripe-integrated validation.

## Features

- Create and manage discount codes (percentage, fixed amount, minimum purchase)
- Real-time usage tracking dashboard with redemption analytics
- Stripe webhook integration for automatic coupon validation
- Bulk code generation with customizable prefixes and expiration
- Shareable coupon links with optional email capture

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/coupon-vault.git
cd coupon-vault

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Stripe keys and database URL
```

## Environment Variables

```
DATABASE_URL=your_database_url
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXTAUTH_SECRET=your_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Usage

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run Stripe webhook listener (development)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## API Endpoints

- `POST /api/coupons` - Create a new coupon
- `GET /api/coupons` - List all coupons
- `POST /api/coupons/validate` - Validate a coupon code
- `POST /api/coupons/bulk` - Generate bulk coupon codes
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Stripe API
- Prisma (database ORM)

## License

MIT