import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, daysOverdue } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, currency')
    .eq('id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [overdueRes, dueSoonRes, paidRes, recentRes] = await Promise.all([
    supabase.from('invoices').select('total').eq('user_id', user.id).eq('status', 'overdue'),
    supabase.from('invoices').select('total').eq('user_id', user.id).in('status', ['draft', 'sent']).lte('due_date', sevenDaysLater).gte('due_date', today),
    supabase.from('invoices').select('total').eq('user_id', user.id).eq('status', 'paid').gte('paid_date', startOfMonth),
    supabase.from('invoices')
      .select('id, invoice_number, total, due_date, status, clients(name), currency')
      .eq('user_id', user.id)
      .in('status', ['overdue', 'sent', 'draft'])
      .order('due_date', { ascending: true })
      .limit(5),
  ])

  const currency = profile?.currency ?? 'NZD'
  const overdueTotal  = (overdueRes.data ?? []).reduce((s, r) => s + r.total, 0)
  const dueSoonTotal  = (dueSoonRes.data ?? []).reduce((s, r) => s + r.total, 0)
  const paidTotal     = (paidRes.data   ?? []).reduce((s, r) => s + r.total, 0)

  const stats = [
    { label: 'Overdue',        value: overdueTotal, color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
    { label: 'Due this week',  value: dueSoonTotal, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
    { label: 'Paid this month',value: paidTotal,    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
  ]

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          G&apos;day{profile?.first_name ? `, ${profile.first_name}` : ''}!
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Here&apos;s your invoice summary.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className={`rounded-xl border p-5 ${s.bg} ${s.border}`}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>
              {formatCurrency(s.value, currency)}
            </p>
          </div>
        ))}
      </div>

      {/* Recent active invoices */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Active invoices</h2>
          <Link href="/invoices/new" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
            + New invoice
          </Link>
        </div>

        {!recentRes.data?.length ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            No active invoices.{' '}
            <Link href="/invoices/new" className="text-blue-600 hover:underline">Add your first one →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recentRes.data.map((inv: any) => {
              const overdue = inv.status === 'overdue' ? daysOverdue(inv.due_date) : null
              return (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{(inv.clients as any)?.name ?? 'No client'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total, inv.currency)}</p>
                      <StatusBadge status={inv.status} daysOver={overdue} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, daysOver }: { status: string; daysOver: number | null }) {
  if (status === 'overdue') return <span className="text-xs font-medium text-red-600">{daysOver}d overdue</span>
  if (status === 'sent')    return <span className="text-xs font-medium text-blue-600">Sent</span>
  if (status === 'draft')   return <span className="text-xs font-medium text-gray-400">Draft</span>
  return null
}
