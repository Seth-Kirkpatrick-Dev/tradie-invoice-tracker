'use client'

import { useState, useRef } from 'react'
import { saveOnboarding } from '@/app/actions/profile'
import { createClient } from '@/lib/supabase/client'

const COUNTRY_OPTIONS = [
  { value: 'NZ', label: 'New Zealand', currency: 'NZD', tax_rate: '15', tax_label: 'GST' },
  { value: 'AU', label: 'Australia',   currency: 'AUD', tax_rate: '10', tax_label: 'GST' },
  { value: 'GB', label: 'UK',          currency: 'GBP', tax_rate: '20', tax_label: 'VAT' },
  { value: 'US', label: 'USA',         currency: 'USD', tax_rate: '0',  tax_label: 'Tax' },
]

const CURRENCY_OPTIONS = ['NZD', 'AUD', 'GBP', 'USD']

interface Props {
  userId: string
  error?: string
}

export default function OnboardingForm({ userId, error }: Props) {
  const [country, setCountry]       = useState('NZ')
  const [currency, setCurrency]     = useState('NZD')
  const [taxRate, setTaxRate]       = useState('15')
  const [taxLabel, setTaxLabel]     = useState('GST')
  const [logoUrl, setLogoUrl]       = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleCountryChange(value: string) {
    setCountry(value)
    const opt = COUNTRY_OPTIONS.find(o => o.value === value)
    if (opt) {
      setCurrency(opt.currency)
      setTaxRate(opt.tax_rate)
      setTaxLabel(opt.tax_label)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Logo must be under 2 MB')
      return
    }
    setUploading(true)
    setUploadError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/logo.${ext}`
    const { error } = await supabase.storage
      .from('business-logos')
      .upload(path, file, { upsert: true })
    if (error) {
      setUploadError(error.message)
    } else {
      const { data } = supabase.storage.from('business-logos').getPublicUrl(path)
      setLogoUrl(`${data.publicUrl}?v=${Date.now()}`)
      setLogoPreview(URL.createObjectURL(file))
    }
    setUploading(false)
  }

  return (
    <form action={saveOnboarding} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
          <input
            name="first_name"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Sam"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
          <input
            name="last_name"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Smith"
          />
        </div>
      </div>

      {/* Business name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
        <input
          name="business_name"
          type="text"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Smith Electrical Ltd"
        />
      </div>

      {/* Country + Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <select
            name="country"
            value={country}
            onChange={e => handleCountryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {COUNTRY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            name="currency"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {CURRENCY_OPTIONS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tax */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tax label <span className="text-gray-400">(e.g. GST, VAT)</span>
          </label>
          <input
            name="tax_label"
            type="text"
            value={taxLabel}
            onChange={e => setTaxLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax rate (%)</label>
          <input
            name="tax_rate"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={taxRate}
            onChange={e => setTaxRate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tax number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {taxLabel} number <span className="text-gray-400">(optional)</span>
        </label>
        <input
          name="tax_number"
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. 123-456-789"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
        <input
          name="phone"
          type="tel"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+64 21 000 0000"
        />
      </div>

      {/* Bank account details */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment details <span className="text-gray-400">(shown on invoices)</span>
        </label>
        <textarea
          name="bank_account_details"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Bank: ANZ&#10;Account: 01-0001-0000001-00&#10;Reference: Invoice number"
        />
      </div>

      {/* Logo upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business logo <span className="text-gray-400">(optional, PNG/JPG, max 2 MB)</span>
        </label>
        <div className="flex items-center gap-4">
          {logoPreview && (
            <img src={logoPreview} alt="Logo preview" className="w-16 h-16 rounded-lg object-contain border border-gray-200" />
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : logoPreview ? 'Change logo' : 'Upload logo'}
          </button>
        </div>
        {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleLogoUpload}
          className="hidden"
        />
        <input type="hidden" name="logo_url" value={logoUrl} />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Set up my account →
      </button>
    </form>
  )
}
