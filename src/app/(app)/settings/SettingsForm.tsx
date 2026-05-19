'use client'

import { useState, useTransition } from 'react'
import { saveOnboarding } from '@/app/actions/profile'

const COUNTRY_OPTIONS = [
  { value: 'NZ', label: 'New Zealand', currency: 'NZD', tax_rate: '15', tax_label: 'GST' },
  { value: 'AU', label: 'Australia',   currency: 'AUD', tax_rate: '10', tax_label: 'GST' },
  { value: 'GB', label: 'UK',          currency: 'GBP', tax_rate: '20', tax_label: 'VAT' },
  { value: 'US', label: 'USA',         currency: 'USD', tax_rate: '0',  tax_label: 'Tax' },
]

const CURRENCY_OPTIONS = ['NZD', 'AUD', 'GBP', 'USD']

export default function SettingsForm({ profile, userId }: { profile: any; userId: string }) {
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [currency, setCurrency] = useState(profile.currency ?? 'NZD')
  const [taxLabel, setTaxLabel] = useState(profile.tax_label ?? 'GST')
  const [taxRate, setTaxRate] = useState(String(Math.round((profile.tax_rate ?? 0.15) * 100)))

  function handleCountryChange(value: string) {
    const opt = COUNTRY_OPTIONS.find(o => o.value === value)
    if (opt) { setCurrency(opt.currency); setTaxLabel(opt.tax_label); setTaxRate(opt.tax_rate) }
  }

  async function handleSubmit(formData: FormData) {
    formData.set('onboarding_completed', 'true')
    startTransition(async () => {
      await saveOnboarding(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">Settings saved.</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Business details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
            <input name="first_name" type="text" defaultValue={profile.first_name ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
            <input name="last_name" type="text" defaultValue={profile.last_name ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
          <input name="business_name" type="text" defaultValue={profile.business_name ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input name="phone" type="tel" defaultValue={profile.phone ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment details <span className="text-gray-400">(shown on invoices)</span></label>
          <textarea name="bank_account_details" rows={3} defaultValue={profile.bank_account_details ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Region & tax</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select name="country" defaultValue={profile.country ?? 'NZ'} onChange={e => handleCountryChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {COUNTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select name="currency" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax label</label>
            <input name="tax_label" type="text" value={taxLabel} onChange={e => setTaxLabel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax rate (%)</label>
            <input name="tax_rate" type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GST / Tax number <span className="text-gray-400">(optional)</span></label>
          <input name="tax_number" type="text" defaultValue={profile.tax_number ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Hidden to preserve onboarding state */}
      <input type="hidden" name="logo_url" value={profile.logo_url ?? ''} />

      <button type="submit" disabled={isPending} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {isPending ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
