'use client'

import Link from 'next/link'
import { formatCurrency, daysOverdue, countryToLocale, formatDate } from '@/lib/utils'

interface Invoice {
  id: string
  invoice_number: string
  total: number
  due_date: string | null
  status: string
  currency: string
  clients: { name: string } | null
}

interface Props {
  firstName: string
  defaultCurrency: string
  country: string
  overdueByCurrency: Record<string, number>
  dueSoonByCurrency: Record<string, number>
  outstandingByCurrency: Record<string, number>
  paidMonthByCurrency: Record<string, number>
  recentInvoices: Invoice[]
}

function CurrencyTotals({ byCurrency, defaultCurrency, className }: {
  byCurrency: Record<string, number>
  defaultCurrency: string
  className: string
}) {
  const entries = Object.entries(byCurrency)
  if (entries.length === 0) return <p className={`text-2xl font-bold mt-1 ${className}`}>{formatCurrency(0, defaultCurrency)}</p>

  const sorted = entries.sort(([a], [b]) =>
    a === defaultCurrency ? -1 : b === defaultCurrency ? 1 : a.localeCompare(b)
  )
  return (
    <div className="mt-1 space-y-0.5">
      {sorted.map(([cur, total]) => (
        <p key={cur} className={`text-2xl font-bold leading-tight ${className}`}>{formatCurrency(total, cur)}</p>
      ))}
    </div>
  )
}

export default function DashboardClient({
  firstName, defaultCurrency, country,
  overdueByCurrency, dueSoonByCurrency, outstandingByCurrency, paidMonthByCurrency,
  recentInvoices,
}: Props) {
  const locale = countryToLocale(country)

  const outstandingEntries = Object.entries(outstandingByCurrency)
  const outstandingTotal = outstandingEntries.length === 1
    ? formatCurrency(outstandingEntries[0][1], outstandingEntries[0][0])
    : outstandingEntries.length === 0
      ? formatCurrency(0, defaultCurrency)
      : null

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          G&apos;day{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Here&apos;s your invoice summary.</p>
      </div>

      {/* Total outstanding banner */}
      <Link href="/invoices?tab=outstanding" className="block bg-blue-600 rounded-2xl p-5 mb-6 text-white hover:bg-blue-700 transition-colors touch-manipulation">
        <p className="text-blue-200 text-sm">Total outstanding</p>
        {outstandingTotal ? (
          <p className="text-3xl font-bold mt-0.5">{outstandingTotal}</p>
        ) : (
          <div className="mt-0.5 space-y-0.5">
            {outstandingEntries.sort(([a], [b]) => a === defaultCurrency ? -1 : b === defaultCurrency ? 1 : a.localeCompare(b)).map(([cur, total]) => (
              <p key={cur} className="text-2xl font-bold leading-tight">{formatCurrency(total, cur)}</p>
            ))}
          </div>
        )}
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link href="/invoices?tab=overdue" className="block rounded-xl border p-5 bg-red-50 border-red-100 hover:brightness-95 transition-all touch-manipulation">
          <p className="text-sm text-gray-500">Overdue</p>
          <CurrencyTotals byCurrency={overdueByCurrency} defaultCurrency={defaultCurrency} className="text-red-600" />
        </Link>
        <Link href="/invoices?tab=sent" className="block rounded-xl border p-5 bg-yellow-50 border-yellow-100 hover:brightness-95 transition-all touch-manipulation">
          <p className="text-sm text-gray-500">Due this week</p>
          <CurrencyTotals byCurrency={dueSoonByCurrency} defaultCurrency={defaultCurrency} className="text-yellow-600" />
        </Link>
        <Link href="/invoices?tab=paid" className="block rounded-xl border p-5 bg-green-50 border-green-100 hover:brightness-95 transition-all touch-manipulation">
          <p className="text-sm text-gray-500">Paid this month</p>
          <CurrencyTotals byCurrency={paidMonthByCurrency} defaultCurrency={defaultCurrency} className="text-green-600" />
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Active invoices</h2>
          <Link href="/invoices/new" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
            + New invoice
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            No active invoices.{' '}
            <Link href="/invoices/new" className="text-blue-600 hover:underline">Add your first one →</Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recentInvoices.map(inv => {
              const days = inv.status === 'overdue' ? daysOverdue(inv.due_date) : null
              return (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {inv.clients?.name ?? 'No client'}
                        {inv.due_date && <> · Due {formatDate(inv.due_date, locale)}</>}
                      </p>
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
