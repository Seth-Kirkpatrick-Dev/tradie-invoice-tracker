'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const COUNTRY_DEFAULTS: Record<string, { currency: string; tax_rate: number; tax_label: string }> = {
  NZ: { currency: 'NZD', tax_rate: 0.15, tax_label: 'GST' },
  AU: { currency: 'AUD', tax_rate: 0.10, tax_label: 'GST' },
  GB: { currency: 'GBP', tax_rate: 0.20, tax_label: 'VAT' },
  US: { currency: 'USD', tax_rate: 0,    tax_label: 'Tax' },
}

const VALID_COUNTRIES = ['NZ', 'AU', 'GB', 'US'] as const
const VALID_CURRENCIES = ['NZD', 'AUD', 'GBP', 'USD'] as const

function parseReminderSchedule(raw: string | null): number[] {
  try {
    const parsed = JSON.parse(raw || '[1,7,14,21]')
    if (
      Array.isArray(parsed) &&
      parsed.length <= 10 &&
      parsed.every(n => Number.isInteger(n) && n >= 1 && n <= 365)
    ) {
      return [...new Set(parsed as number[])].sort((a, b) => a - b)
    }
  } catch { /* fall through */ }
  return [1, 7, 14, 21]
}

function buildProfilePayload(formData: FormData) {
  const countryRaw = (formData.get('country') as string) || 'NZ'
  const country = (VALID_COUNTRIES as readonly string[]).includes(countryRaw) ? countryRaw : 'NZ'
  const defaults = COUNTRY_DEFAULTS[country] ?? COUNTRY_DEFAULTS.NZ
  const currencyRaw = (formData.get('currency') as string) || defaults.currency
  const currency = (VALID_CURRENCIES as readonly string[]).includes(currencyRaw) ? currencyRaw : defaults.currency
  const tax_label = (formData.get('tax_label') as string) || defaults.tax_label
  const tax_rate_str = formData.get('tax_rate') as string
  const tax_rate_raw = tax_rate_str ? parseFloat(tax_rate_str) / 100 : defaults.tax_rate
  const tax_rate = Math.max(0, Math.min(1, isFinite(tax_rate_raw) ? tax_rate_raw : defaults.tax_rate))

  const prefixRaw = (formData.get('invoice_number_prefix') as string)?.trim().toUpperCase() || 'INV'
  const invoice_number_prefix = prefixRaw.replace(/[^A-Z0-9-]/g, '').slice(0, 10) || 'INV'

  return {
    first_name:           (formData.get('first_name')           as string) || null,
    last_name:            (formData.get('last_name')            as string) || null,
    business_name:        (formData.get('business_name')        as string) || null,
    phone:                (formData.get('phone')                as string) || null,
    country,
    currency,
    tax_number:           (formData.get('tax_number')           as string) || null,
    tax_rate,
    tax_label,
    bank_account_details: (formData.get('bank_account_details') as string) || null,
    logo_url:             (formData.get('logo_url')             as string) || null,
    invoice_number_prefix,
    reminder_schedule:    parseReminderSchedule(formData.get('reminder_schedule') as string),
    default_email_subject: (formData.get('default_email_subject') as string) ?? undefined,
    default_email_body:    (formData.get('default_email_body')    as string) ?? undefined,
    onboarding_completed: true,
  }
}

export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .update(buildProfilePayload(formData))
    .eq('id', user.id)

  if (error) {
    redirect('/onboarding?error=' + encodeURIComponent(error.message))
  }

  redirect('/dashboard')
}

export async function saveSettings(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update(buildProfilePayload(formData))
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { error: null }
}
