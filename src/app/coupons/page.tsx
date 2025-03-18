'use client'

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Coupon, CouponStatus } from '@/types';

const STATUS_STYLES: Record<CouponStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-red-100 text-red-700',
  DEPLETED: 'bg-orange-100 text-orange-700',
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/coupons?${params}`);
      const data = await res.json();
      if (data.success) setCoupons(data.data);
    } catch (err) {
      console.error('Failed to fetch coupons', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchCoupons, 300);
    return () => clearTimeout(timer);
  }, [fetchCoupons]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return;
    try {
      await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete coupon', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all your discount codes</p>
        </div>
        <Link
          href="/coupons/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Create Coupon
        </Link>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search coupons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No coupons found.</p>
            <Link href="/coupons/new" className="mt-2 inline-block text-indigo-600 text-sm hover:underline">
              Create your first coupon →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-gray-900">{coupon.code}</span>
                      <button
                        onClick={() => handleCopy(coupon.code)}
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Copy code"
                      >
                        {copied === coupon.code ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{coupon.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {coupon.discountType === 'PERCENTAGE'
                      ? `${coupon.discountValue}%`
                      : `$${coupon.discountValue.toFixed(2)}`}
                    {coupon.minimumPurchase ? (
                      <p className="text-xs text-gray-400 font-normal">min ${coupon.minimumPurchase}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[coupon.status] || 'bg-gray-100 text-gray-600'}`}>
                      {coupon.status.charAt(0) + coupon.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {coupon.currentRedemptions}
                    {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ''}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {coupon.endDate
                      ? new Date(coupon.endDate).toLocaleDateString()
                      : <span className="text-gray-300">Never</span>}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
