'use client'

import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-gray-900">
          Discount Code Management
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 transition-colors"
        >
          <BellIcon className="w-6 h-6" />
        </button>
        <button
          type="button"
          className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <UserCircleIcon className="w-8 h-8 text-gray-400" />
          <span className="text-sm font-medium">Account</span>
        </button>
      </div>
    </header>
  )
}
