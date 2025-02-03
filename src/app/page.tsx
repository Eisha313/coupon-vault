import Link from 'next/link';

// Dashboard statistics interface
interface DashboardStats {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  revenueImpact: number;
}

// Mock data for initial development
const mockStats: DashboardStats = {
  totalCoupons: 24,
  activeCoupons: 12,
  totalRedemptions: 156,
  revenueImpact: 2340.50,
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Coupon Vault</h1>
            <Link
              href="/coupons/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Create Coupon
            </Link>
          </div>
        </div>
      </header>

      {/* Dashboard Stats */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Analytics Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Coupons"
            value={mockStats.totalCoupons.toString()}
            subtitle="All time created"
          />
          <StatCard
            title="Active Coupons"
            value={mockStats.activeCoupons.toString()}
            subtitle="Currently valid"
            highlight
          />
          <StatCard
            title="Total Redemptions"
            value={mockStats.totalRedemptions.toString()}
            subtitle="Codes used"
          />
          <StatCard
            title="Revenue Impact"
            value={`$${mockStats.revenueImpact.toLocaleString()}`}
            subtitle="Discount value given"
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              title="Bulk Generate"
              description="Create multiple codes with custom prefixes"
              href="/coupons/bulk"
            />
            <ActionCard
              title="View Analytics"
              description="Detailed redemption reports and insights"
              href="/analytics"
            />
            <ActionCard
              title="Manage Coupons"
              description="Edit, disable, or delete existing codes"
              href="/coupons"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

// Stat card component for dashboard metrics
function StatCard({
  title,
  value,
  subtitle,
  highlight = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${
      highlight ? 'ring-2 ring-indigo-500' : ''
    }`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

// Action card component for quick navigation
function ActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
    >
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600 mt-2">{description}</p>
    </Link>
  );
}