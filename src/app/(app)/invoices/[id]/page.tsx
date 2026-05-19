import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, daysOverdue } from '@/lib/utils'
import InvoiceActions from './InvoiceActions'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: inv } = await supabase
    .from('invoices')
    .select('*, clients(name, email, phone, address)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!inv) notFound()

  const client = inv.clients as any
  const lineItems = (inv.line_items as any[]) ?? []
  const days = inv.status === 'overdue' ? daysOverdue(inv.due_date) : null

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Invoices</Link>
          <h1 className="text-2xl font-bold text-gray-900">{inv.invoice_number}</h1>
          <StatusBadge status={inv.status} />
        </div>
        {inv.status !== 'paid' && (
          <Link href={`/invoices/${inv.id}/edit`} className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Edit
          </Link>
        )}
      </div>

      {days !== null && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
          {days} day{days !== 1 ? 's' : ''} overdue
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Client</p>
            <p className="font-medium text-gray-900">{client?.name ?? '—'}</p>
            {client?.email && <p className="text-sm text-gray-500">{client.email}</p>}
            {client?.phone && <p className="text-sm text-gray-500">{client.phone}</p>}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Issue date</p>
              <p className="text-sm text-gray-900">{formatDate(inv.issue_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Due date</p>
              <p className="text-sm text-gray-900">{formatDate(inv.due_date)}</p>
            </div>
            {inv.paid_date && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Paid</p>
                <p className="text-sm text-green-700 font-medium">{formatDate(inv.paid_date)}</p>
              </div>
            )}
          </div>
        </div>
        {inv.description && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-gray-700">{inv.description}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left pb-2">Item</th>
              <th className="text-right pb-2">Qty</th>
              <th className="text-right pb-2">Price</th>
              <th className="text-right pb-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lineItems.map((item, i) => (
              <tr key={i}>
                <td className="py-2 text-gray-800">{item.description}</td>
                <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                <td className="py-2 text-right text-gray-600">{formatCurrency(item.unit_price, inv.currency)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.quantity * item.unit_price, inv.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span><span>{formatCurrency(inv.subtotal, inv.currency)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>{inv.tax_label} ({(inv.tax_rate * 100).toFixed(1)}%)</span>
            <span>{formatCurrency(inv.tax_amount, inv.currency)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
            <span>Total</span><span>{formatCurrency(inv.total, inv.currency)}</span>
          </div>
        </div>
      </div>

      {inv.payment_method && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payment details</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{inv.payment_method}</p>
        </div>
      )}

      <InvoiceActions invoiceId={inv.id} status={inv.status} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-500', sent: 'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700', paid: 'bg-green-100 text-green-700',
  }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${map[status] ?? ''}`}>{status}</span>
}
