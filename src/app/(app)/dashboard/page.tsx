import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()

  const today         = new Date().toISOString().split('T')[0]
  const sevenDaysOut  = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const startOfMonth  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [profileRes, overdueRes, dueSoonRes, allUnpaidRes, paidRes, recentRes] = await Promise.all([
    supabase.from('profiles').select('first_name, currency, country').eq('id', user.id).single(),
    supabase.from('invoices').select('total, currency').eq('user_id', user.id).eq('status', 'overdue'),
    supabase.from('invoices').select('total, currency').eq('user_id', user.id).eq('status', 'sent').lte('due_date', sevenDaysOut).gte('due_date', today),
    supabase.from('invoices').select('total, currency').eq('user_id', user.id).in('status', ['sent', 'overdue']),
    supabase.from('invoices').select('total, currency').eq('user_id', user.id).eq('status', 'paid').gte('paid_date', startOfMonth),
    supabase.from('invoices').select('id, invoice_number, total, due_date, status, currency, clients(name)').eq('user_id', user.id).in('status', ['overdue', 'sent', 'draft']).order('due_date', { ascending: true }).limit(5),
  ])

  function sumByCurrency(rows: { total: number; currency: string }[] | null): Record<string, number> {
    const out: Record<string, number> = {}
    for (const r of rows ?? []) {
      out[r.currency] = (out[r.currency] ?? 0) + r.total
    }
    return out
  }

  return (
    <DashboardClient
      firstName={profileRes.data?.first_name ?? ''}
      defaultCurrency={profileRes.data?.currency ?? 'NZD'}
      country={profileRes.data?.country ?? 'NZ'}
      overdueByCurrency={sumByCurrency(overdueRes.data)}
      dueSoonByCurrency={sumByCurrency(dueSoonRes.data)}
      outstandingByCurrency={sumByCurrency(allUnpaidRes.data)}
      paidMonthByCurrency={sumByCurrency(paidRes.data)}
      recentInvoices={(recentRes.data ?? []) as any}
    />
  )
}
