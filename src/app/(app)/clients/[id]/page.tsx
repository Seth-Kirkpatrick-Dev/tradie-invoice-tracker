import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, countryToLocale } from '@/lib/utils'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()
  const [clientRes, invoicesRes, profileRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).eq('user_id', user.id).is('deleted_at', null).single(),
    supabase.from('invoices').select('id, invoice_number, total, due_date, issue_date, status, currency').eq('user_id', user.id).eq('client_id', id).order('issue_date', { ascending: false }),
    supabase.from('profiles').select('country').eq('id', user.id).single(),
  ])
  const locale = countryToLocale(profileRes.data?.country)

  if (!clientRes.data) notFound()

  const client = clientRes.data
  const invoices = invoicesRes.data ?? []
  const currency = invoices[0]?.currency ?? 'NZD'
  const outstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clients" className="text-gray-400 hover:text-gray-600 text-sm">← Clients</Link>
        <h1 className="text-2xl font-bold text-gray-900 truncate">{client.name}</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-2">
        {client.email   && <p className="text-sm text-gray-700">{client.email}</p>}
        {client.phone   && <p className="text-sm text-gray-700">{client.phone}</p>}
        {client.address && <p className="text-sm text-gray-700">{client.address}</p>}
        {client.notes   && <p className="text-sm text-gray-500 pt-2 mt-2 border-t border-gray-100">{client.notes}</p>}

        {invoices.length > 0 && (
          <div className="flex gap-6 pt-3 mt-2 border-t border-gray-100">
            {outstanding > 0 && (
              <div>
                <p className="text-xs text-gray-400">Outstanding</p>
                <p className="text-base font-bold text-red-600">{formatCurrency(outstanding, currency)}</p>
              </div>
            )}
            {totalPaid > 0 && (
              <div>
                <p className="text-xs text-gray-400">Total paid</p>
                <p className="text-base font-bold text-green-600">{formatCurrency(totalPaid, currency)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Invoices</h2>
          <Link href="/invoices/new" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
            + New invoice
          </Link>
        </div>
        {invoices.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">No invoices for this client yet.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {invoices.map(inv => (
              <li key={inv.id}>
                <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(inv.issue_date, locale)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total, inv.currency)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'text-gray-400', sent: 'text-blue-600',
    overdue: 'text-red-600', paid: 'text-green-600',
  }
  return <span className={`text-xs font-medium capitalize ${map[status] ?? ''}`}>{status}</span>
}
