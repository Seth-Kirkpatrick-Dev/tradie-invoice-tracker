'use client'

import { useState, useTransition, useRef } from 'react'
import { saveSettings } from '@/app/actions/profile'
import { createClient } from '@/lib/supabase/client'
import { X, Plus } from 'lucide-react'

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
  const [logoUrl, setLogoUrl] = useState(profile.logo_url ?? '')
  const [logoPreview, setLogoPreview] = useState(profile.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setUploadError('Logo must be under 2 MB'); return }
    setUploading(true); setUploadError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/logo.${ext}`
    const { error } = await supabase.storage.from('business-logos').upload(path, file, { upsert: true })
    if (error) { setUploadError(error.message) } else {
      const { data } = supabase.storage.from('business-logos').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
      setLogoPreview(URL.createObjectURL(file))
    }
    setUploading(false)
  }
  const [taxLabel, setTaxLabel] = useState(profile.tax_label ?? 'GST')
  const [taxRate, setTaxRate] = useState(String(Math.round((profile.tax_rate ?? 0.15) * 100)))
  const [schedule, setSchedule] = useState<number[]>(
    Array.isArray(profile.reminder_schedule) ? profile.reminder_schedule : [1, 7, 14, 21]
  )
  const [scheduleInput, setScheduleInput] = useState('')

  function handleCountryChange(value: string) {
    const opt = COUNTRY_OPTIONS.find(o => o.value === value)
    if (opt) { setCurrency(opt.currency); setTaxLabel(opt.tax_label); setTaxRate(opt.tax_rate) }
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveSettings(formData)
      if (!result.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
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

      {/* Reminder schedule */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Auto-reminder schedule</h2>
          <p className="text-xs text-gray-400 mt-0.5">Days after due date to send automatic reminders. Pro plan only.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {schedule.sort((a, b) => a - b).map(day => (
            <span key={day} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
              Day {day}
              <button type="button" onClick={() => setSchedule(s => s.filter(d => d !== day))} className="text-blue-400 hover:text-blue-700 ml-1">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="90"
            value={scheduleInput}
            onChange={e => setScheduleInput(e.target.value)}
            placeholder="Add day"
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => {
              const d = parseInt(scheduleInput)
              if (d > 0 && !schedule.includes(d)) setSchedule(s => [...s, d])
              setScheduleInput('')
            }}
            className="flex items-center gap-1 text-sm text-blue-600 border border-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-50"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <input type="hidden" name="reminder_schedule" value={JSON.stringify(schedule)} />
      </div>

      {/* Email reminder template */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Reminder email template</h2>
          <p className="text-xs text-gray-400 mt-0.5">Sent automatically to clients when invoices are overdue. Pro plan only.</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 space-y-1">
          <p className="font-medium text-gray-500">Available placeholders:</p>
          <p><code className="text-gray-600">{'{client_first_name}'}</code> <code className="text-gray-600">{'{invoice_number}'}</code> <code className="text-gray-600">{'{amount}'}</code> <code className="text-gray-600">{'{due_date}'}</code> <code className="text-gray-600">{'{days_overdue}'}</code> <code className="text-gray-600">{'{payment_method}'}</code> <code className="text-gray-600">{'{tradie_business_name}'}</code></p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject line</label>
          <input
            name="default_email_subject"
            type="text"
            defaultValue={profile.default_email_subject ?? 'Friendly reminder: Invoice {invoice_number} is overdue'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email body</label>
          <textarea
            name="default_email_body"
            rows={8}
            defaultValue={profile.default_email_body ?? ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
          />
        </div>
      </div>

      {/* Logo upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Business logo</h2>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-gray-200 bg-gray-50" />
          ) : (
            <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xs">Logo</div>
          )}
          <div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
              {uploading ? 'Uploading…' : logoPreview ? 'Change logo' : 'Upload logo'}
            </button>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG or WebP — max 2 MB</p>
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
      </div>

      <input type="hidden" name="logo_url" value={logoUrl} />

      <button type="submit" disabled={isPending} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {isPending ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
