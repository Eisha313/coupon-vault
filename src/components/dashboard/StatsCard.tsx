'use client';

import { cn } from '@/lib/utils';

type IconType = 'ticket' | 'check-circle' | 'shopping-cart' | 'dollar';
type Variant = 'default' | 'success' | 'info' | 'warning';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  variant?: Variant;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

const iconMap: Record<IconType, React.ReactNode> = {
  ticket: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  'check-circle': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'shopping-cart': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  dollar: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

const variantStyles: Record<Variant, { bg: string; icon: string }> = {
  default: { bg: 'bg-gray-100', icon: 'text-gray-600' },
  success: { bg: 'bg-green-100', icon: 'text-green-600' },
  info: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  warning: { bg: 'bg-amber-100', icon: 'text-amber-600' }
};

export function StatsCard({ title, value, icon, variant = 'default', trend, description }: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn('p-2 rounded-lg', styles.bg)}>
          <span className={styles.icon}>{iconMap[icon]}</span>
        </div>
        {trend && (
          <span className={cn(
            'text-sm font-medium flex items-center',
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
