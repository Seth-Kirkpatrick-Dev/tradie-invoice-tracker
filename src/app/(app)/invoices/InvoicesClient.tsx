'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { formatCurrency, formatDate, daysOverdue, countryToLocale } from '@/lib/utils'

const PAGE_SIZE = 20

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
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [locale, setLocale] = useState('en-NZ')
  const searchParams = useSearchParams()
  const initialTab = (STATUS_TABS as readonly string[]).includes(searchParams.get('tab') ?? '') ? searchParams.get('tab') as Tab : 'all'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [atFreeLimit, setAtFreeLimit] = useState(false)

  const buildQuery = useCallback((userId: string, tab: Tab, offset = 0) => {
    let q = supabase
      .from('invoices')
      .select('id, invoice_number, total, due_date, status, currency, clients(name)')
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (tab === 'outstanding') q = q.in('status', ['sent', 'overdue'])
    else if (tab !== 'all') q = q.eq('status', tab)
    return q
  }, [supabase])

  useEffect(() => {
    async function load() {
      setInvoices(null)
      setHasMore(false)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [invoicesRes, profileRes, activeCountRes] = await Promise.all([
        buildQuery(user.id, activeTab),
        supabase.from('profiles').select('subscription_tier, country').eq('id', user.id).single(),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['draft', 'sent', 'overdue']),
      ])

      const data = (invoicesRes.data ?? []) as unknown as Invoice[]
      setInvoices(data)
      setHasMore(data.length === PAGE_SIZE)
      setLocale(countryToLocale(profileRes.data?.country))
      setAtFreeLimit(profileRes.data?.subscription_tier === 'free' && (activeCountRes.count ?? 0) >= 5)
    }
    load()
  }, [supabase, activeTab, buildQuery])

  async function loadMore() {
    if (!invoices || loadingMore) return
    setLoadingMore(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingMore(false); return }

    const res = await buildQuery(user.id, activeTab, invoices.length)
    const more = (res.data ?? []) as unknown as Invoice[]
    setInvoices(prev => [...(prev ?? []), ...more])
    setHasMore(more.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  const q = search.trim().toLowerCase()
  const displayed = !q || invoices === null ? invoices : invoices.filter(inv =>
    inv.invoice_number.toLowerCase().includes(q) ||
    (inv.clients?.name ?? '').toLowerCase().includes(q)
  )

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search invoices or clients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        {atFreeLimit ? (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg font-medium">
            5/5 active — <Link href="/upgrade" className="underline">Upgrade to Pro</Link>
          </span>
        ) : (
          <Link href="/invoices/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + New invoice
          </Link>
        )}
      </div>

      <div className="w-full overflow-x-auto pb-1 mb-5">
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
        {displayed === null ? (
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
        ) : displayed.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {search.trim() ? `No invoices matching "${search.trim()}".` :
             activeTab === 'all' ? <>No invoices yet. <Link href="/invoices/new" className="text-blue-600 hover:underline">Add your first one →</Link></> :
             activeTab === 'outstanding' ? "Nothing outstanding — you're all caught up!" :
             `No ${activeTab} invoices.`}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {displayed.map(inv => {
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
                          {inv.clients?.name ?? 'No client'} · Due {formatDate(inv.due_date, locale)}
                          {days !== null && <span className="text-red-500 font-medium"> · {days}d overdue</span>}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 ml-4 shrink-0">{formatCurrency(inv.total, inv.currency)}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {hasMore && !search.trim() && (
              <div className="px-5 py-4 border-t border-gray-100 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
