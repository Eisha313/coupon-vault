'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TicketIcon,
  ChartBarIcon,
  CogIcon,
  PlusCircleIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartBarIcon },
  { name: 'Coupons', href: '/coupons', icon: TicketIcon },
  { name: 'Create Coupon', href: '/coupons/new', icon: PlusCircleIcon },
  { name: 'Shared Links', href: '/links', icon: LinkIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <TicketIcon className="w-8 h-8 text-indigo-600" />
        <span className="ml-2 text-xl font-bold text-gray-900">Coupon Vault</span>
      </div>
      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-700' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
