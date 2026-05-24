'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'

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

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft:   ['sent', 'paid'],
  sent:    ['paid', 'overdue'],
  overdue: ['paid'],
  paid:    [],
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    return { error: 'Invalid status' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single()

  if (!existing) return { error: 'Invoice not found' }
  if (!VALID_TRANSITIONS[existing.status]?.includes(status)) {
    return { error: `Cannot transition from ${existing.status} to ${status}` }
  }

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

  // Prevent editing paid invoices (mirrors the page-level redirect)
  const { data: existing } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single()
  if (existing?.status === 'paid') return { error: 'Paid invoices cannot be edited' }

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

export async function emailInvoiceToClient(invoiceId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const [{ data: inv }, { data: profile }] = await Promise.all([
    supabase.from('invoices')
      .select('*, clients(name, email)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single(),
    supabase.from('profiles')
      .select('first_name, business_name, default_email_subject, default_email_body')
      .eq('id', user.id)
      .single(),
  ])

  if (!inv) return { error: 'Invoice not found' }
  const client = inv.clients as any
  if (!client?.email) return { error: 'Client has no email address' }
  if (!process.env.RESEND_API_KEY) return { error: 'Email sending is not configured' }

  const lineItems: { description: string; quantity: number; unit_price: number }[] = Array.isArray(inv.line_items) ? inv.line_items : []
  const amount = `${inv.currency} ${Number(inv.total).toFixed(2)}`
  const clientFirstName = client.name?.split(' ')[0] ?? client.name
  const businessName = profile?.business_name ?? ''

  const vars: Record<string, string> = {
    invoice_number:       inv.invoice_number,
    amount,
    due_date:             inv.due_date ?? '',
    days_overdue:         '0',
    client_first_name:    clientFirstName,
    tradie_business_name: businessName,
    payment_method:       inv.payment_method ?? '',
    currency:             inv.currency,
  }

  const interpolate = (t: string) => t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  const interpolateHtml = (t: string) => {
    const escaped = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, escapeHtml(v)]))
    return t.replace(/\{(\w+)\}/g, (_, k) => escaped[k] ?? `{${k}}`).replace(/\n/g, '<br>')
  }

  const defaultSubject = profile?.default_email_subject ?? `Invoice {invoice_number} from {tradie_business_name}`
  const defaultBody    = profile?.default_email_body    ?? `Hi {client_first_name},\n\nPlease find your invoice below.\n\nAmount due: {amount}\nDue date: {due_date}\n\nPayment details:\n{payment_method}\n\nThank you,\n{tradie_business_name}`

  const subject = interpolate(defaultSubject)
  const textBody = interpolate(defaultBody)

  const lineItemsHtml = lineItems.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(item.description)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;">${escapeHtml(inv.currency)} ${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${escapeHtml(inv.currency)} ${Number(item.quantity * item.unit_price).toFixed(2)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px;">
    <h2 style="margin:0 0 4px;">${escapeHtml(inv.invoice_number)}</h2>
    <p style="color:#6b7280;margin:0 0 24px;">${escapeHtml(businessName)}</p>
    <p>${interpolateHtml(defaultBody)}</p>
    ${lineItems.length ? `
    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <thead><tr style="text-align:left;font-size:12px;color:#6b7280;">
        <th style="padding-bottom:8px;border-bottom:2px solid #e5e7eb;">Item</th>
        <th style="padding-bottom:8px;border-bottom:2px solid #e5e7eb;text-align:right;">Qty</th>
        <th style="padding-bottom:8px;border-bottom:2px solid #e5e7eb;text-align:right;">Price</th>
        <th style="padding-bottom:8px;border-bottom:2px solid #e5e7eb;text-align:right;">Total</th>
      </tr></thead>
      <tbody>${lineItemsHtml}</tbody>
    </table>
    <div style="text-align:right;">
      <p style="margin:4px 0;color:#6b7280;">Subtotal: ${escapeHtml(inv.currency)} ${Number(inv.subtotal).toFixed(2)}</p>
      <p style="margin:4px 0;color:#6b7280;">${escapeHtml(inv.tax_label ?? 'Tax')} (${((inv.tax_rate ?? 0) * 100).toFixed(1)}%): ${escapeHtml(inv.currency)} ${Number(inv.tax_amount).toFixed(2)}</p>
      <p style="margin:8px 0;font-size:18px;font-weight:700;">Total: ${escapeHtml(amount)}</p>
    </div>` : ''}
    ${inv.payment_method ? `<div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Payment details</p>
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(inv.payment_method)}</p>
    </div>` : ''}
  </body></html>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const { error: sendError } = await resend.emails.send({ from, to: client.email, subject, html, text: textBody })

  if (sendError) return { error: sendError.message }

  await supabase.from('notifications').insert({
    user_id:    user.id,
    type:       'invoice_sent',
    title:      `Invoice ${inv.invoice_number} emailed to client`,
    body:       `Sent to ${client.name} at ${client.email}.`,
    invoice_id: invoiceId,
  })

  revalidatePath(`/invoices/${invoiceId}`)
  return { error: null }
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
