interface Redemption {
  id: string;
  customerEmail: string | null;
  discountApplied: number;
  orderTotal: number | null;
  redeemedAt: Date;
  coupon: {
    code: string;
    discountType: string;
    discountValue: number;
  };
}

interface RecentRedemptionsProps {
  redemptions: Redemption[];
}

export function RecentRedemptions({ redemptions }: RecentRedemptionsProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Redemptions</h3>
        <p className="text-sm text-gray-500 mt-1">Last 10 coupon uses</p>
      </div>
      {redemptions.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No redemptions yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coupon</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {redemptions.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-mono font-medium text-indigo-600">{r.coupon.code}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {r.customerEmail ?? <span className="text-gray-400 italic">Anonymous</span>}
                  </td>
                  <td className="px-6 py-4 font-medium text-green-600">
                    -${Number(r.discountApplied).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {r.orderTotal ? `$${Number(r.orderTotal).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(r.redeemedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
