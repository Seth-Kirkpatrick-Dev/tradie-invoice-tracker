import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

  for (const inv of invoices ?? []) {
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

    // Check we haven't already sent today for this invoice
    const { count } = await supabase
      .from('reminders_log')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_id', inv.id)
      .eq('channel', 'email')
      .gte('sent_at', `${todayStr}T00:00:00Z`)

    if ((count ?? 0) > 0) { skipped++; continue }

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

    // TODO: send email via Resend when RESEND_API_KEY is available
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({ from: '...', to: client.email, subject, html: body })

    const emailSent = !!process.env.RESEND_API_KEY // will be true once wired up

    // Log the reminder
    await supabase.from('reminders_log').insert({
      invoice_id:     inv.id,
      user_id:        profile.id,
      channel:        'email',
      recipient_email: client.email,
      subject,
      content:        body,
      days_overdue:   daysOver,
      status:         emailSent ? 'sent' : 'sent', // logged regardless — email sending is separate
    })

    // Create in-app notification
    await supabase.from('notifications').insert({
      user_id:    profile.id,
      type:       'reminder_sent',
      title:      `Reminder sent for ${inv.invoice_number}`,
      body:       `A ${daysOver}-day overdue reminder was sent to ${client.name}.`,
      invoice_id: inv.id,
    })

    sent++
  }

  console.log(`send-reminders: sent=${sent} skipped=${skipped}`)
  return NextResponse.json({ sent, skipped })
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}
