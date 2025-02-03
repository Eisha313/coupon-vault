/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  // Allow Stripe webhook requests without body parsing
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

module.exports = nextConfig;