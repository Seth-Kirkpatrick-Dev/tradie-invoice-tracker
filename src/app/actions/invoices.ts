'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const FREE_TIER_LIMIT = 5

export async function createInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Check subscription tier and active invoice count
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, next_invoice_number, invoice_number_prefix, currency, tax_rate, tax_label, bank_account_details')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  if (profile.subscription_tier === 'free') {
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['draft', 'sent', 'overdue'])

    if ((count ?? 0) >= FREE_TIER_LIMIT) {
      return { error: 'free_limit', message: 'You have reached the 5 active invoice limit on the free plan. Upgrade to Pro for unlimited invoices.' }
    }
  }

  // Atomically claim the next invoice number
  const { data: updated } = await supabase
    .from('profiles')
    .update({ next_invoice_number: profile.next_invoice_number + 1 })
    .eq('id', user.id)
    .select('next_invoice_number')
    .single()

  const invoiceNum = profile.next_invoice_number
  const prefix = profile.invoice_number_prefix || 'INV'
  const invoiceNumber = `${prefix}-${String(invoiceNum).padStart(3, '0')}`

  const lineItemsRaw = formData.get('line_items') as string
  const lineItems = JSON.parse(lineItemsRaw || '[]')

  const subtotal = lineItems.reduce(
    (sum: number, item: { quantity: number; unit_price: number }) =>
      sum + item.quantity * item.unit_price,
    0
  )
  const taxRateVal = parseFloat(formData.get('tax_rate') as string) / 100
  const taxAmount  = subtotal * taxRateVal
  const total      = subtotal + taxAmount

  const { error } = await supabase.from('invoices').insert({
    user_id:               user.id,
    client_id:             (formData.get('client_id') as string) || null,
    invoice_number:        invoiceNumber,
    invoice_number_int:    invoiceNum,
    description:           (formData.get('description') as string)?.trim() || null,
    line_items:            lineItems,
    currency:              formData.get('currency') as string || profile.currency,
    subtotal,
    tax_rate:              taxRateVal,
    tax_label:             formData.get('tax_label') as string || profile.tax_label,
    tax_amount:            taxAmount,
    total,
    issue_date:            (formData.get('issue_date') as string) || null,
    due_date:              (formData.get('due_date')   as string) || null,
    status:                'draft',
    payment_method:        (formData.get('payment_method') as string)?.trim() || profile.bank_account_details || null,
    notes:                 (formData.get('notes') as string)?.trim() || null,
    auto_reminders_enabled: formData.get('auto_reminders_enabled') === 'true',
  })

  if (error) return { error: error.message }

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  redirect('/invoices')
}

export async function markAsPaid(invoiceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_date: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('user_id', user.id)

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { error: error?.message ?? null }
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', invoiceId)
    .eq('user_id', user.id)

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { error: error?.message ?? null }
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('user_id', user.id)

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { error: error?.message ?? null }
}
