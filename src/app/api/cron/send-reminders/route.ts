import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Fetch all overdue invoices with reminders enabled, plus owner profile and client
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, total, currency, due_date, payment_method,
      auto_reminders_enabled,
      clients(name, email),
      profiles!invoices_user_id_fkey(
        id, first_name, business_name, subscription_tier,
        reminder_schedule, default_email_subject, default_email_body
      )
    `)
    .eq('status', 'overdue')
    .eq('auto_reminders_enabled', true)

  if (error) {
    console.error('send-reminders fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  const allInvoices = invoices ?? []

  // Batch-fetch all invoices that already received a reminder today (eliminates N+1)
  const allIds = allInvoices.map(inv => inv.id)
  const alreadySentIds = new Set<string>()
  if (allIds.length > 0) {
    const { data: sentToday } = await supabase
      .from('reminders_log')
      .select('invoice_id')
      .in('invoice_id', allIds)
      .eq('channel', 'email')
      .gte('sent_at', `${todayStr}T00:00:00Z`)
    ;(sentToday ?? []).forEach(r => alreadySentIds.add(r.invoice_id!))
  }

  for (const inv of allInvoices) {
    const profile = inv.profiles as any
    const client  = inv.clients  as any

    // Only Pro/Pro+ users get auto reminders
    if (!['pro', 'pro_plus'].includes(profile?.subscription_tier)) { skipped++; continue }

    // No client email — skip
    if (!client?.email) { skipped++; continue }

    const dueDate  = new Date(inv.due_date!)
    const daysOver = Math.floor((today.getTime() - dueDate.getTime()) / 86400000)

    const schedule: number[] = Array.isArray(profile?.reminder_schedule)
      ? profile.reminder_schedule
      : [1, 7, 14, 21]

    // Only send if today matches a scheduled day
    if (!schedule.includes(daysOver)) { skipped++; continue }

    // Skip if already sent today (checked via batch query above)
    if (alreadySentIds.has(inv.id)) { skipped++; continue }

    // Build email content from template
    const amount = `${inv.currency} ${Number(inv.total).toFixed(2)}`
    const subject = interpolate(profile?.default_email_subject ?? '', {
      invoice_number:       inv.invoice_number,
      amount,
      due_date:             inv.due_date ?? '',
      days_overdue:         String(daysOver),
      client_first_name:    client.name?.split(' ')[0] ?? client.name,
      tradie_business_name: profile?.business_name ?? '',
      payment_method:       inv.payment_method ?? '',
      currency:             inv.currency,
    })
    const body = interpolate(profile?.default_email_body ?? '', {
      invoice_number:       inv.invoice_number,
      amount,
      due_date:             inv.due_date ?? '',
      days_overdue:         String(daysOver),
      client_first_name:    client.name?.split(' ')[0] ?? client.name,
      tradie_business_name: profile?.business_name ?? '',
      payment_method:       inv.payment_method ?? '',
      currency:             inv.currency,
    })

    let emailSent = false
    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
        const { error: sendError } = await resend.emails.send({
          from,
          to: client.email,
          subject,
          html: interpolateHtml(profile?.default_email_body ?? '', {
            invoice_number:       inv.invoice_number,
            amount,
            due_date:             inv.due_date ?? '',
            days_overdue:         String(daysOver),
            client_first_name:    client.name?.split(' ')[0] ?? client.name,
            tradie_business_name: profile?.business_name ?? '',
            payment_method:       inv.payment_method ?? '',
            currency:             inv.currency,
          }),
        })
        if (sendError) {
          console.error(`send-reminders email error for ${inv.invoice_number}:`, sendError)
        } else {
          emailSent = true
        }
      }

      // Log the reminder for deduplication (even if not yet sending emails)
      await supabase.from('reminders_log').insert({
        invoice_id:      inv.id,
        user_id:         profile.id,
        channel:         'email',
        recipient_email: client.email,
        subject,
        content:         body,
        days_overdue:    daysOver,
        status:          emailSent ? 'sent' : (process.env.RESEND_API_KEY ? 'failed' : 'queued'),
      })

      // Only create a notification when email was actually sent
      if (emailSent) {
        await supabase.from('notifications').insert({
          user_id:    profile.id,
          type:       'reminder_sent',
          title:      `Reminder sent for ${inv.invoice_number}`,
          body:       `A ${daysOver}-day overdue reminder was sent to ${client.name}.`,
          invoice_id: inv.id,
        })
      }

      sent++
    } catch (err) {
      console.error(`send-reminders unexpected error for ${inv.invoice_number}:`, err)
      skipped++
    }
  }

  console.log(`send-reminders: sent=${sent} skipped=${skipped}`)
  return NextResponse.json({ sent, skipped })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

function interpolateHtml(template: string, vars: Record<string, string>): string {
  const escaped = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, escapeHtml(v)]))
  return interpolate(template, escaped).replace(/\n/g, '<br>')
}
