import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import { notFound, redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import PrintButton from './PrintButton'

export default async function InvoicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const [invRes, profileRes] = await Promise.all([
    supabase.from('invoices').select('*, clients(name, email, phone, address)').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('profiles').select('first_name, last_name, business_name, phone, email, logo_url, tax_number, bank_account_details').eq('id', user.id).single(),
  ])

  if (!invRes.data) notFound()

  const inv = invRes.data
  const profile = profileRes.data
  const client = inv.clients as any
  const lineItems = (inv.line_items as any[]) ?? []

  return (
    <>
      <PrintButton />
      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { background: #f9fafb; }
        @media print { body { background: white; } }
      `}</style>

      <div className="min-h-screen bg-gray-50 print:bg-white py-8 px-6 print:p-0">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm print:shadow-none print:rounded-none p-8 print:p-0">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              {profile?.logo_url && (
                <img src={profile.logo_url} alt="Logo" className="h-14 w-auto object-contain mb-3" />
              )}
              <p className="font-bold text-gray-900 text-lg">{profile?.business_name ?? `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()}</p>
              {profile?.phone && <p className="text-sm text-gray-500">{profile.phone}</p>}
              {user.email && <p className="text-sm text-gray-500">{user.email}</p>}
              {profile?.tax_number && <p className="text-sm text-gray-500">Tax No: {profile.tax_number}</p>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">INVOICE</p>
              <p className="text-gray-500 mt-1">{inv.invoice_number}</p>
              <span className={`inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-500'
              }`}>{inv.status}</span>
            </div>
          </div>

          {/* Dates + Client */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Bill to</p>
              {client ? (
                <>
                  <p className="font-semibold text-gray-900">{client.name}</p>
                  {client.email   && <p className="text-sm text-gray-500">{client.email}</p>}
                  {client.phone   && <p className="text-sm text-gray-500">{client.phone}</p>}
                  {client.address && <p className="text-sm text-gray-500">{client.address}</p>}
                </>
              ) : (
                <p className="text-sm text-gray-400">No client</p>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Issue date</p>
                <p className="text-sm text-gray-900">{formatDate(inv.issue_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Due date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(inv.due_date)}</p>
              </div>
              {inv.paid_date && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Paid</p>
                  <p className="text-sm font-medium text-green-700">{formatDate(inv.paid_date)}</p>
                </div>
              )}
            </div>
          </div>

          {inv.description && (
            <div className="mb-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-gray-700">{inv.description}</p>
            </div>
          )}

          {/* Line items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left pb-2 text-xs text-gray-400 uppercase tracking-wide font-medium">Item</th>
                <th className="text-right pb-2 text-xs text-gray-400 uppercase tracking-wide font-medium w-12">Qty</th>
                <th className="text-right pb-2 text-xs text-gray-400 uppercase tracking-wide font-medium w-24">Price</th>
                <th className="text-right pb-2 text-xs text-gray-400 uppercase tracking-wide font-medium w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any, i: number) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-800">{item.description}</td>
                  <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unit_price, inv.currency)}</td>
                  <td className="py-2.5 text-right font-medium">{formatCurrency(item.quantity * item.unit_price, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-56 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{formatCurrency(inv.subtotal, inv.currency)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{inv.tax_label} ({(inv.tax_rate * 100).toFixed(1)}%)</span>
                <span>{formatCurrency(inv.tax_amount, inv.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Total</span><span>{formatCurrency(inv.total, inv.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment details */}
          {inv.payment_method && (
            <div className="border-t border-gray-200 pt-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Payment details</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{inv.payment_method}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
