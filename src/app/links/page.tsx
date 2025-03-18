import { prisma } from '@/lib/prisma';
import { CopyButton } from './CopyButton';

async function getCouponsWithCaptures() {
  return prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { emailCaptures: true, redemptions: true },
      },
    },
  });
}

export default async function LinksPage() {
  const coupons = await getCouponsWithCaptures();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const active = coupons.filter((c) => c.status === 'ACTIVE');
  const inactive = coupons.filter((c) => c.status !== 'ACTIVE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shared Links</h1>
        <p className="text-gray-500 text-sm mt-1">
          Share these links with customers — they can view and copy the coupon code on a branded page.
        </p>
      </div>

      {coupons.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No coupons yet</h2>
          <p className="text-gray-500 text-sm">
            Create a coupon first, then share its link with customers.
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active</h2>
              <div className="space-y-3">
                {active.map((coupon) => {
                  const shareUrl = `${baseUrl}/share/${coupon.code}`;
                  const discount =
                    coupon.discountType === 'PERCENTAGE'
                      ? `${coupon.discountValue}% off`
                      : `$${coupon.discountValue.toFixed(2)} off`;

                  return (
                    <div
                      key={coupon.id}
                      className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold text-gray-900">{coupon.code}</span>
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            {discount}
                          </span>
                          {coupon.endDate && new Date(coupon.endDate) < new Date() ? (
                            <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Expired</span>
                          ) : null}
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-gray-400 mb-2 truncate">{coupon.description}</p>
                        )}
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs text-gray-400 truncate font-mono">{shareUrl}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-400">
                            <span className="font-medium text-gray-600">{coupon._count.emailCaptures}</span> email captures
                          </span>
                          <span className="text-xs text-gray-400">
                            <span className="font-medium text-gray-600">{coupon._count.redemptions}</span> redemptions
                          </span>
                          {coupon.minimumPurchase ? (
                            <span className="text-xs text-gray-400">
                              min ${Number(coupon.minimumPurchase).toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <CopyButton url={shareUrl} />
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-gray-50"
                          title="Preview"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {inactive.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Inactive / Expired</h2>
              <div className="space-y-3">
                {inactive.map((coupon) => {
                  const shareUrl = `${baseUrl}/share/${coupon.code}`;
                  const discount =
                    coupon.discountType === 'PERCENTAGE'
                      ? `${coupon.discountValue}% off`
                      : `$${coupon.discountValue.toFixed(2)} off`;

                  return (
                    <div
                      key={coupon.id}
                      className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between gap-4 opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold text-gray-700">{coupon.code}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                            {discount}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {coupon.status.charAt(0) + coupon.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-400">
                            <span className="font-medium">{coupon._count.emailCaptures}</span> email captures
                          </span>
                          <span className="text-xs text-gray-400">
                            <span className="font-medium">{coupon._count.redemptions}</span> redemptions
                          </span>
                        </div>
                      </div>
                      <CopyButton url={shareUrl} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
