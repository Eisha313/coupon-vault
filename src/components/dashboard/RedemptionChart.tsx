'use client';

import { useMemo } from 'react';

interface ChartData {
  date: string;
  redemptions: number;
  discountAmount: number;
}

interface RedemptionChartProps {
  data: ChartData[];
}

export function RedemptionChart({ data }: RedemptionChartProps) {
  const maxRedemptions = useMemo(() => {
    return Math.max(...data.map(d => d.redemptions), 1);
  }, [data]);

  const maxDiscount = useMemo(() => {
    return Math.max(...data.map(d => d.discountAmount), 1);
  }, [data]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Redemption Trends</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No redemption data available for the last 30 days
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Redemption Trends</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded" />
            <span className="text-gray-600">Redemptions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded" />
            <span className="text-gray-600">Discount ($)</span>
          </div>
        </div>
      </div>

      <div className="h-64 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxRedemptions}</span>
          <span>{Math.round(maxRedemptions / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-14 h-full flex items-end gap-1 pb-8">
          {data.slice(-14).map((item, index) => (
            <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end" style={{ height: '180px' }}>
                {/* Redemptions bar */}
                <div
                  className="flex-1 bg-indigo-500 rounded-t transition-all hover:bg-indigo-600"
                  style={{ height: `${(item.redemptions / maxRedemptions) * 100}%` }}
                  title={`${item.redemptions} redemptions`}
                />
                {/* Discount bar */}
                <div
                  className="flex-1 bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                  style={{ height: `${(item.discountAmount / maxDiscount) * 100}%` }}
                  title={`$${item.discountAmount.toFixed(2)} discount`}
                />
              </div>
              <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                {formatDate(item.date)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-600">Total Redemptions</p>
          <p className="text-lg font-semibold text-gray-900">
            {data.reduce((sum, d) => sum + d.redemptions, 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Discounts</p>
          <p className="text-lg font-semibold text-gray-900">
            ${data.reduce((sum, d) => sum + d.discountAmount, 0).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Avg per Day</p>
          <p className="text-lg font-semibold text-gray-900">
            {(data.reduce((sum, d) => sum + d.redemptions, 0) / data.length).toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
}
