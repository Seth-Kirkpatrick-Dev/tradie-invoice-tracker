'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import Link from 'next/link'
import { formatCurrency, daysOverdue } from '@/lib/utils'

interface Invoice {
  id: string
  invoice_number: string
  total: number
  due_date: string | null
  status: string
  currency: string
  clients: { name: string } | null
}

interface Stats {
  overdue: number
  dueSoon: number
  paidMonth: number
}

export default function DashboardClient() {
  const supabase = useSupabase()
  const [stats, setStats] = useState<Stats | null>(null)
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [firstName, setFirstName] = useState('')
  const [currency, setCurrency] = useState('NZD')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]
      const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [profileRes, overdueRes, dueSoonRes, paidRes, recentRes] = await Promise.all([
        supabase.from('profiles').select('first_name, currency').eq('id', user.id).single(),
        supabase.from('invoices').select('total').eq('user_id', user.id).eq('status', 'overdue'),
        supabase.from('invoices').select('total').eq('user_id', user.id).in('status', ['draft', 'sent']).lte('due_date', sevenDaysLater).gte('due_date', today),
        supabase.from('invoices').select('total').eq('user_id', user.id).eq('status', 'paid').gte('paid_date', startOfMonth),
        supabase.from('invoices').select('id, invoice_number, total, due_date, status, currency, clients(name)').eq('user_id', user.id).in('status', ['overdue', 'sent', 'draft']).order('due_date', { ascending: true }).limit(5),
      ])

      const c = profileRes.data?.currency ?? 'NZD'
      setCurrency(c)
      setFirstName(profileRes.data?.first_name ?? '')
      setStats({
        overdue:   (overdueRes.data  ?? []).reduce((s, r) => s + r.total, 0),
        dueSoon:   (dueSoonRes.data  ?? []).reduce((s, r) => s + r.total, 0),
        paidMonth: (paidRes.data     ?? []).reduce((s, r) => s + r.total, 0),
      })
      setInvoices((recentRes.data ?? []) as unknown as Invoice[])
    }
    load()
  }, [supabase])

  const statCards = [
    { label: 'Overdue',         value: stats?.overdue,    color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
    { label: 'Due this week',   value: stats?.dueSoon,    color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
    { label: 'Paid this month', value: stats?.paidMonth,  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
  ]

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          G&apos;day{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Here&apos;s your invoice summary.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className={`rounded-xl border p-5 ${s.bg} ${s.border}`}>
            <p className="text-sm text-gray-500">{s.label}</p>
            {s.value === undefined ? (
              <div className="h-8 w-28 bg-gray-200 rounded animate-pulse mt-1" />
            ) : (
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{formatCurrency(s.value, currency)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Active invoices</h2>
          <Link href="/invoices/new" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
            + New invoice
          </Link>
        </div>

        {invoices === null ? (
          <div className="divide-y divide-gray-50">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center justify-between px-5 py-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            No active invoices.{' '}
            <Link href="/invoices/new" className="text-blue-600 hover:underline">Add your first one →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {invoices.map(inv => {
              const days = inv.status === 'overdue' ? daysOverdue(inv.due_date) : null
              return (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{inv.clients?.name ?? 'No client'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total, inv.currency)}</p>
                      {inv.status === 'overdue' && <span className="text-xs font-medium text-red-600">{days}d overdue</span>}
                      {inv.status === 'sent'    && <span className="text-xs font-medium text-blue-600">Sent</span>}
                      {inv.status === 'draft'   && <span className="text-xs font-medium text-gray-400">Draft</span>}
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
