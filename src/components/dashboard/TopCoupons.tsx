interface TopCoupon {
  id: string;
  code: string;
  redemptionCount: number;
  totalDiscount: number;
  isActive: boolean;
}

interface TopCouponsProps {
  coupons: TopCoupon[];
}

export function TopCoupons({ coupons }: TopCouponsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Top Coupons</h3>
        <p className="text-sm text-gray-500 mt-1">By redemption count</p>
      </div>
      {coupons.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No coupons yet</div>
      ) : (
        <div className="divide-y divide-gray-200">
          {coupons.map((coupon, index) => (
            <div key={coupon.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-300 w-5">{index + 1}</span>
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-900">{coupon.code}</p>
                  <p className="text-xs text-gray-500">{coupon.redemptionCount} uses</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">${coupon.totalDiscount.toFixed(2)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  coupon.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {coupon.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
