'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const FREE_TIER_LIMIT = 5

interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

function parseLineItems(raw: string): LineItem[] | null {
  try {
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return null
    const items: LineItem[] = []
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) return null
      const qty   = Number(item.quantity)
      const price = Number(item.unit_price)
      if (!isFinite(qty) || !isFinite(price) || qty < 0 || price < 0) return null
      items.push({
        description: String(item.description ?? '').slice(0, 500),
        quantity:    Math.round(qty   * 1000) / 1000,
        unit_price:  Math.round(price * 100)  / 100,
      })
    }
    return items
  } catch {
    return null
  }
}

function clampTaxRate(raw: string | null): number {
  const n = parseFloat(raw ?? '0') / 100
  return Math.max(0, Math.min(1, isFinite(n) ? n : 0))
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Check subscription tier and active invoice count
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, invoice_number_prefix, currency, tax_rate, tax_label, bank_account_details')
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

  const lineItems = parseLineItems(formData.get('line_items') as string)
  if (!lineItems) return { error: 'Invalid line items' }

  // Atomically claim the next invoice number via a DB function to avoid race conditions
  const { data: claimedNum, error: rpcError } = await supabase.rpc('claim_invoice_number', { p_user_id: user.id })
  if (rpcError || claimedNum === null) return { error: rpcError?.message ?? 'Could not assign invoice number' }

  const invoiceNum = claimedNum as number
  const prefix = profile.invoice_number_prefix || 'INV'
  const invoiceNumber = `${prefix}-${String(invoiceNum).padStart(3, '0')}`

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const taxRateVal = clampTaxRate(formData.get('tax_rate') as string)
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

const VALID_STATUSES = ['draft', 'sent', 'overdue', 'paid'] as const

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    return { error: 'Invalid status' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const update: Record<string, unknown> = { status }
  if (status === 'sent') update.sent_date = new Date().toISOString()

  const { error } = await supabase
    .from('invoices')
    .update(update)
    .eq('id', invoiceId)
    .eq('user_id', user.id)

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { error: error?.message ?? null }
}

export async function updateInvoice(invoiceId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const lineItems = parseLineItems(formData.get('line_items') as string)
  if (!lineItems) return { error: 'Invalid line items' }

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const taxRateVal = clampTaxRate(formData.get('tax_rate') as string)
  const taxAmount  = subtotal * taxRateVal
  const total      = subtotal + taxAmount

  const { error } = await supabase
    .from('invoices')
    .update({
      client_id:             (formData.get('client_id') as string) || null,
      description:           (formData.get('description') as string)?.trim() || null,
      line_items:            lineItems,
      subtotal,
      tax_rate:              taxRateVal,
      tax_label:             formData.get('tax_label') as string,
      tax_amount:            taxAmount,
      total,
      issue_date:            (formData.get('issue_date') as string) || null,
      due_date:              (formData.get('due_date')   as string) || null,
      payment_method:        (formData.get('payment_method') as string)?.trim() || null,
      notes:                 (formData.get('notes') as string)?.trim() || null,
      auto_reminders_enabled: formData.get('auto_reminders_enabled') === 'true',
    })
    .eq('id', invoiceId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  redirect(`/invoices/${invoiceId}`)
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
