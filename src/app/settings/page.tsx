'use client'

import { useState, useEffect } from 'react'

interface Settings {
  storeName: string
  baseUrl: string
  stripePublishableKey: string
  notifyOnRedemption: boolean
  notifyEmail: string
}

const DEFAULTS: Settings = {
  storeName: 'My Store',
  baseUrl: 'http://localhost:3000',
  stripePublishableKey: '',
  notifyOnRedemption: false,
  notifyEmail: '',
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-6 items-start py-5">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('coupon-vault-settings')
    if (stored) {
      try { setSettings({ ...DEFAULTS, ...JSON.parse(stored) }) } catch {}
    }
    fetch('/api/coupons?limit=1')
      .then((r) => setDbStatus(r.ok ? 'ok' : 'error'))
      .catch(() => setDbStatus('error'))
  }, [])

  const set = (key: keyof Settings, value: string | boolean) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('coupon-vault-settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your Coupon Vault configuration</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">

        {/* General */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">General</h2>
          </div>
          <div className="px-6 divide-y divide-gray-100">
            <Field label="Store Name" hint="Displayed on the customer-facing share page">
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => set('storeName', e.target.value)}
                placeholder="My Store"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>
            <Field label="Base URL" hint="Used to generate shareable coupon links">
              <input
                type="url"
                value={settings.baseUrl}
                onChange={(e) => set('baseUrl', e.target.value)}
                placeholder="https://yourdomain.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1.5 font-mono">
                {settings.baseUrl}/share/CODE
              </p>
            </Field>
          </div>
        </div>

        {/* Stripe */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Stripe Integration</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${settings.stripePublishableKey ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {settings.stripePublishableKey ? 'Configured' : 'Not configured'}
            </span>
          </div>
          <div className="px-6 divide-y divide-gray-100">
            <Field label="Publishable Key" hint="Find this in Stripe Dashboard → Developers → API keys">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings.stripePublishableKey}
                  onChange={(e) => set('stripePublishableKey', e.target.value)}
                  placeholder="pk_live_..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </Field>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Notifications</h2>
          </div>
          <div className="px-6 divide-y divide-gray-100">
            <Field label="Redemption alerts" hint="Get notified when a coupon is used">
              <Toggle checked={settings.notifyOnRedemption} onChange={(v) => set('notifyOnRedemption', v)} />
            </Field>
            {settings.notifyOnRedemption && (
              <Field label="Notification email" hint="Where to send the alerts">
                <input
                  type="email"
                  value={settings.notifyEmail}
                  onChange={(e) => set('notifyEmail', e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </Field>
            )}
          </div>
        </div>

        {/* Database */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">System</h2>
          </div>
          <div className="px-6 divide-y divide-gray-100">
            <Field label="Database" hint="PostgreSQL connection via DATABASE_URL">
              {dbStatus === 'checking' && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-3.5 h-3.5 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                  Checking connection...
                </div>
              )}
              {dbStatus === 'ok' && (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg font-medium border border-green-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Connected
                </span>
              )}
              {dbStatus === 'error' && (
                <span className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg font-medium border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  Connection error
                </span>
              )}
            </Field>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pb-8">
          {saved && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}
