'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FormState {
  code: string
  description: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: string
  minimumPurchase: string
  maxRedemptions: string
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'INACTIVE'
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-6 items-start py-5">
      <div>
        <p className="text-sm font-medium text-gray-900">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
        {hint && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

export default function CreateCouponPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minimumPurchase: '',
    maxRedemptions: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm((prev) => ({ ...prev, code }))
    if (errors.code) setErrors((prev) => { const next = { ...prev }; delete next.code; return next })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})

    const body: Record<string, unknown> = {
      code: form.code,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      status: form.status,
    }
    if (form.description) body.description = form.description
    if (form.minimumPurchase) body.minimumPurchase = parseFloat(form.minimumPurchase)
    if (form.maxRedemptions) body.maxRedemptions = parseInt(form.maxRedemptions)
    if (form.startDate) body.startDate = form.startDate
    if (form.endDate) body.endDate = form.endDate

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => router.push('/coupons'), 1500)
      } else if (data.error?.details?.errors) {
        const fieldErrors: Record<string, string> = {}
        for (const [field, msgs] of Object.entries(data.error.details.errors)) {
          fieldErrors[field] = (msgs as string[]).join(', ')
        }
        setErrors(fieldErrors)
      } else {
        setErrors({ _root: data.error?.message || 'Failed to create coupon' })
      }
    } catch {
      setErrors({ _root: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Coupon Created!</h2>
          <p className="text-gray-400 mt-1 text-sm">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/coupons" className="hover:text-indigo-600 transition-colors">Coupons</Link>
          <span>/</span>
          <span className="text-gray-600">New</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create Coupon</h1>
        <p className="text-gray-500 text-sm mt-1">Set up a new discount code for your store</p>
      </div>

      {errors._root && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errors._root}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Details</h2>
          </div>
          <div className="px-6 divide-y divide-gray-100">
            <Field label="Coupon Code" hint="Customers enter this at checkout" required>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. SAVE20"
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.code ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={generateCode}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
              {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
            </Field>

            <Field label="Description" hint="Internal note — not shown to customers">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="e.g. Summer sale promotion"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </Field>
          </div>
        </div>

        {/* Discount */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Discount</h2>
          </div>
          <div className="px-6 divide-y divide-gray-100">
            <Field label="Type" hint="How the discount is calculated">
              <div className="grid grid-cols-2 gap-3">
                {(['PERCENTAGE', 'FIXED_AMOUNT'] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      form.discountType === type ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="discountType"
                      value={type}
                      checked={form.discountType === type}
                      onChange={handleChange}
                      className="text-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {type === 'PERCENTAGE' ? 'e.g. 10% off' : 'e.g. $5 off'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Value" hint={form.discountType === 'PERCENTAGE' ? 'Between 1 and 100' : 'Fixed dollar amount'} required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none font-medium">
                  {form.discountType === 'PERCENTAGE' ? '%' : '$'}
                </span>
                <input
                  type="number"
                  name="discountValue"
                  value={form.discountValue}
                  onChange={handleChange}
                  placeholder={form.discountType === 'PERCENTAGE' ? '10' : '5.00'}
                  min="0"
                  max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                  step="0.01"
                  className={`w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.discountValue ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
              </div>
              {errors.discountValue && <p className="mt-1 text-xs text-red-600">{errors.discountValue}</p>}
            </Field>

            <Field label="Minimum Purchase" hint="Required order amount to use this coupon">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">$</span>
                <input
                  type="number"
                  name="minimumPurchase"
                  value={form.minimumPurchase}
                  onChange={handleChange}
                  placeholder="None"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Usage & Expiry */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Usage &amp; Expiry</h2>
          </div>
          <div className="px-6 divide-y divide-gray-100">
            <Field label="Max Redemptions" hint="Total times this code can be used — leave blank for unlimited">
              <input
                type="number"
                name="maxRedemptions"
                value={form.maxRedemptions}
                onChange={handleChange}
                placeholder="Unlimited"
                min="1"
                step="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>

            <Field label="Active Period" hint="When this coupon can be used">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start date</label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End date</label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.endDate ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                  />
                  {errors.endDate && <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>}
                </div>
              </div>
            </Field>

            <Field label="Status" hint="Set to inactive to save as a draft">
              <div className="grid grid-cols-2 gap-3">
                {(['ACTIVE', 'INACTIVE'] as const).map((s) => (
                  <label
                    key={s}
                    className={`flex items-center gap-2.5 p-3 border rounded-lg cursor-pointer transition-colors ${
                      form.status === s ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={form.status === s}
                      onChange={handleChange}
                      className="text-indigo-600"
                    />
                    <div>
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${s === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm font-medium text-gray-700">{s === 'ACTIVE' ? 'Active' : 'Draft'}</span>
                    </div>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link
            href="/coupons"
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 font-medium"
          >
            {submitting ? 'Creating...' : 'Create Coupon'}
          </button>
        </div>
      </form>
    </div>
  )
}
