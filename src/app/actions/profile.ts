'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const COUNTRY_DEFAULTS: Record<string, { currency: string; tax_rate: number; tax_label: string }> = {
  NZ: { currency: 'NZD', tax_rate: 0.15, tax_label: 'GST' },
  AU: { currency: 'AUD', tax_rate: 0.10, tax_label: 'GST' },
  GB: { currency: 'GBP', tax_rate: 0.20, tax_label: 'VAT' },
  US: { currency: 'USD', tax_rate: 0,    tax_label: 'Tax' },
}

export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const country = (formData.get('country') as string) || 'NZ'
  const defaults = COUNTRY_DEFAULTS[country] ?? COUNTRY_DEFAULTS.NZ

  const currency  = (formData.get('currency')  as string) || defaults.currency
  const tax_label = (formData.get('tax_label') as string) || defaults.tax_label
  const tax_rate_str = formData.get('tax_rate') as string
  const tax_rate = tax_rate_str ? parseFloat(tax_rate_str) / 100 : defaults.tax_rate

  const { error } = await supabase
    .from('profiles')
    .update({
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
      onboarding_completed: true,
    })
    .eq('id', user.id)

  if (error) {
    redirect('/onboarding?error=' + encodeURIComponent(error.message))
  }

  redirect('/dashboard')
}
