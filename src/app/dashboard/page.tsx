import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RedemptionChart } from '@/components/dashboard/RedemptionChart';
import { RecentRedemptions } from '@/components/dashboard/RecentRedemptions';
import { TopCoupons } from '@/components/dashboard/TopCoupons';

async function getDashboardStats() {
  const [totalCoupons, activeCoupons, totalRedemptions, revenueImpact] = await Promise.all([
    prisma.coupon.count(),
    prisma.coupon.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } },
        ],
      },
    }),
    prisma.redemption.count(),
    prisma.redemption.aggregate({
      _sum: { discountApplied: true },
    }),
  ]);

  return {
    totalCoupons,
    activeCoupons,
    totalRedemptions,
    revenueImpact: Number(revenueImpact._sum.discountApplied) || 0,
  };
}

async function getRedemptionData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const redemptions = await prisma.redemption.findMany({
    where: { redeemedAt: { gte: thirtyDaysAgo } },
    select: { redeemedAt: true, discountApplied: true },
    orderBy: { redeemedAt: 'asc' },
  });

  const grouped = redemptions.reduce((acc, r) => {
    const date = r.redeemedAt.toISOString().split('T')[0];
    if (!acc[date]) acc[date] = { count: 0, amount: 0 };
    acc[date].count++;
    acc[date].amount += Number(r.discountApplied);
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    redemptions: data.count,
    discountAmount: data.amount,
  }));
}

async function getRecentRedemptions() {
  return prisma.redemption.findMany({
    take: 10,
    orderBy: { redeemedAt: 'desc' },
    include: {
      coupon: {
        select: { code: true, discountType: true, discountValue: true },
      },
    },
  });
}

async function getTopCoupons() {
  const coupons = await prisma.coupon.findMany({
    include: {
      _count: { select: { redemptions: true } },
      redemptions: { select: { discountApplied: true } },
    },
    orderBy: { redemptions: { _count: 'desc' } },
    take: 5,
  });

  return coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    redemptionCount: coupon._count.redemptions,
    totalDiscount: coupon.redemptions.reduce((sum, r) => sum + Number(r.discountApplied), 0),
    isActive: coupon.status === 'ACTIVE',
  }));
}

export default async function DashboardPage() {
  const [stats, chartData, recentRedemptions, topCoupons] = await Promise.all([
    getDashboardStats(),
    getRedemptionData(),
    getRecentRedemptions(),
    getTopCoupons(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Track your coupon performance and redemption analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Coupons"
          value={stats.totalCoupons}
          icon="ticket"
        />
        <StatsCard
          title="Active Coupons"
          value={stats.activeCoupons}
          icon="check-circle"
          variant="success"
        />
        <StatsCard
          title="Total Redemptions"
          value={stats.totalRedemptions}
          icon="shopping-cart"
          variant="info"
        />
        <StatsCard
          title="Revenue Impact"
          value={`$${stats.revenueImpact.toFixed(2)}`}
          icon="dollar"
          variant="warning"
          description="Total discounts applied"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-80 bg-gray-100 animate-pulse rounded-lg" />}>
            <RedemptionChart data={chartData} />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<div className="h-80 bg-gray-100 animate-pulse rounded-lg" />}>
            <TopCoupons coupons={topCoupons} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
        <RecentRedemptions redemptions={recentRedemptions} />
      </Suspense>
    </div>
  );
}
