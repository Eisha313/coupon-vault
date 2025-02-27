'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface CouponData {
  code: string;
  description: string | null;
  discountDisplay: string;
  minimumPurchase: number | null;
  expiresAt: string | null;
  requiresEmail: boolean;
}

export default function ShareableCouponPage() {
  const params = useParams();
  const code = params.code as string;

  const [coupon, setCoupon] = useState<CouponData | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCoupon();
  }, [code]);

  const fetchCoupon = async () => {
    try {
      const response = await fetch(`/api/share/${code}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to load coupon');
        return;
      }

      setCoupon(data);
    } catch (err) {
      setError('Failed to load coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaiming(true);
    setError(null);

    try {
      const response = await fetch(`/api/share/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to claim coupon');
        return;
      }

      setClaimed(true);
    } catch (err) {
      setError('Failed to claim coupon');
    } finally {
      setClaiming(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !coupon) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Coupon Claimed!</h1>
          <p className="text-gray-600 mb-6">Use this code at checkout:</p>
          <div className="bg-gray-100 rounded-xl p-4 mb-6">
            <span className="text-3xl font-mono font-bold text-purple-600">{code}</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎁</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Special Discount!</h1>
          {coupon?.description && (
            <p className="text-gray-600">{coupon.description}</p>
          )}
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white text-center mb-6">
          <div className="text-4xl font-bold mb-2">{coupon?.discountDisplay}</div>
          <div className="text-sm opacity-80">
            Code: <span className="font-mono font-bold">{coupon?.code}</span>
          </div>
          {coupon?.minimumPurchase && coupon.minimumPurchase > 0 && (
            <div className="text-xs mt-2 opacity-70">
              Min. purchase: ${coupon.minimumPurchase.toFixed(2)}
            </div>
          )}
        </div>

        {coupon?.expiresAt && (
          <div className="text-center text-sm text-gray-500 mb-6">
            Expires: {new Date(coupon.expiresAt).toLocaleDateString()}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleClaim}>
          {(coupon?.requiresEmail || true) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {coupon?.requiresEmail ? 'Enter your email to claim' : 'Email (optional)'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required={coupon?.requiresEmail}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={claiming}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claiming ? 'Claiming...' : 'Claim This Coupon'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Coupon Vault
        </p>
      </div>
    </div>
  );
}
