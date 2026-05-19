'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils'

const STATUS_TABS = ['all', 'outstanding', 'overdue', 'sent', 'draft', 'paid'] as const
type Tab = typeof STATUS_TABS[number]

interface Invoice {
  id: string
  invoice_number: string
  total: number
  due_date: string | null
  status: string
  currency: string
  clients: { name: string } | null
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-500', sent: 'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700', paid: 'bg-green-100 text-green-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[status] ?? ''}`}>{status}</span>
}

export default function InvoicesClient() {
  const supabase = useSupabase()
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const searchParams = useSearchParams()
  const initialTab = (STATUS_TABS as readonly string[]).includes(searchParams.get('tab') ?? '') ? searchParams.get('tab') as Tab : 'all'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [atFreeLimit, setAtFreeLimit] = useState(false)

  useEffect(() => {
    async function load() {
      setInvoices(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('invoices')
        .select('id, invoice_number, total, due_date, status, currency, clients(name)')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (activeTab === 'outstanding') query = query.in('status', ['sent', 'overdue'])
      else if (activeTab !== 'all') query = query.eq('status', activeTab)

      const [invoicesRes, profileRes, activeCountRes] = await Promise.all([
        query,
        supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['draft', 'sent', 'overdue']),
      ])

      const data = (invoicesRes.data ?? []) as unknown as Invoice[]
      setInvoices(data)

      setAtFreeLimit(profileRes.data?.subscription_tier === 'free' && (activeCountRes.count ?? 0) >= 5)
    }
    load()
  }, [supabase, activeTab])

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

      <div className="overflow-x-auto pb-1 mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {invoices === null ? (
          <div className="divide-y divide-gray-100">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center justify-between px-5 py-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {activeTab === 'all' ? <>No invoices yet. <Link href="/invoices/new" className="text-blue-600 hover:underline">Add your first one →</Link></> :
             activeTab === 'outstanding' ? 'Nothing outstanding — you\'re all caught up!' :
             `No ${activeTab} invoices.`}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {invoices.map(inv => {
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
                        {inv.clients?.name ?? 'No client'} · Due {formatDate(inv.due_date)}
                        {days !== null && <span className="text-red-500 font-medium"> · {days}d overdue</span>}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 ml-4 shrink-0">{formatCurrency(inv.total, inv.currency)}</p>
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
