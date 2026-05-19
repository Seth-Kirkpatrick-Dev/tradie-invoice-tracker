import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils'

const STATUS_TABS = ['all', 'overdue', 'sent', 'draft', 'paid'] as const

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const params = await searchParams
  const activeTab = params.status ?? 'all'

  let query = supabase
    .from('invoices')
    .select('id, invoice_number, total, due_date, status, currency, clients(name)')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (activeTab !== 'all') query = query.eq('status', activeTab)

  const { data: invoices } = await query

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const activeCount = (invoices ?? []).filter(i => ['draft','sent','overdue'].includes(i.status)).length
  const atFreeLimit = profile?.subscription_tier === 'free' && activeCount >= 5

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        {atFreeLimit ? (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg font-medium">
            5/5 active — <Link href="/settings" className="underline">Upgrade to Pro</Link>
          </span>
        ) : (
          <Link href="/invoices/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + New invoice
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab}
            href={tab === 'all' ? '/invoices' : `/invoices?status=${tab}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {!invoices?.length ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No invoices{activeTab !== 'all' ? ` with status "${activeTab}"` : ''}.
            {activeTab === 'all' && (
              <> <Link href="/invoices/new" className="text-blue-600 hover:underline">Add your first one →</Link></>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {invoices.map((inv: any) => {
              const days = inv.status === 'overdue' ? daysOverdue(inv.due_date) : null
              return (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{inv.invoice_number}</p>
                        <StatusBadge status={inv.status} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(inv.clients as any)?.name ?? 'No client'} · Due {formatDate(inv.due_date)}
                        {days !== null && <span className="text-red-500 font-medium"> · {days}d overdue</span>}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 ml-4 shrink-0">
                      {formatCurrency(inv.total, inv.currency)}
                    </p>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:   'bg-gray-100 text-gray-500',
    sent:    'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700',
    paid:    'bg-green-100 text-green-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[status] ?? ''}`}>{status}</span>
}
