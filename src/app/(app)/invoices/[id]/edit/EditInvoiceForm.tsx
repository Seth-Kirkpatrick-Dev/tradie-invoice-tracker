'use client'

import { useState, useTransition } from 'react'
import { updateInvoice } from '@/app/actions/invoices'
import { Plus, Trash2 } from 'lucide-react'

interface LineItem { description: string; quantity: number; unit_price: number }
interface Client { id: string; name: string }

export default function EditInvoiceForm({ invoice, clients }: { invoice: any; clients: Client[] }) {
  const existing: LineItem[] = Array.isArray(invoice.line_items) ? invoice.line_items : []
  const [lineItems, setLineItems] = useState<LineItem[]>(existing.length ? existing : [{ description: '', quantity: 1, unit_price: 0 }])
  const [taxRate, setTaxRate] = useState((invoice.tax_rate * 100).toFixed(1))
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = subtotal * (parseFloat(taxRate) / 100)
  const total = subtotal + taxAmount
  const fmt = (n: number) => n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function addLine() { setLineItems(p => [...p, { description: '', quantity: 1, unit_price: 0 }]) }
  function removeLine(idx: number) { setLineItems(p => p.filter((_, i) => i !== idx)) }
  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    setLineItems(p => p.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(formData: FormData) {
    formData.set('line_items', JSON.stringify(lineItems))
    startTransition(async () => {
      const result = await updateInvoice(invoice.id, formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select name="client_id" defaultValue={invoice.client_id ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— No client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job description</label>
          <input name="description" type="text" defaultValue={invoice.description ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue date</label>
            <input name="issue_date" type="date" defaultValue={invoice.issue_date ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
            <input name="due_date" type="date" defaultValue={invoice.due_date ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Line items</h2>
        <div className="space-y-3">
          {lineItems.map((item, idx) => (
            <div key={idx} className="space-y-1.5 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <input type="text" value={item.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Description" className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)} className="p-2 text-gray-400 hover:text-red-500 shrink-0"><Trash2 size={15} /></button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={item.quantity} min="0" step="0.01" onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)} placeholder="Qty" className="w-14 shrink-0 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-gray-400 text-sm shrink-0">×</span>
                <input type="number" value={item.unit_price} min="0" step="0.01" onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Unit price" className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-sm text-gray-600 shrink-0 w-20 text-right tabular-nums">{fmt(item.quantity * item.unit_price)}</span>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLine} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
          <Plus size={15} /> Add line
        </button>
        <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <input name="tax_label" type="text" defaultValue={invoice.tax_label} className="w-12 text-xs border-0 border-b border-gray-300 focus:outline-none bg-transparent" />
              <input name="tax_rate" type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="w-14 text-xs border-0 border-b border-gray-300 focus:outline-none bg-transparent text-right" />
              <span className="text-xs">%</span>
            </div>
            <span>{fmt(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-1">
            <span>Total</span><span>{fmt(total)} <span className="font-normal text-gray-500 text-xs">{invoice.currency}</span></span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Payment & notes</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment details</label>
          <textarea name="payment_method" rows={3} defaultValue={invoice.payment_method ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" rows={2} defaultValue={invoice.notes ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="hidden" name="auto_reminders_enabled" value="false" />
          <input type="checkbox" name="auto_reminders_enabled" value="true" defaultChecked={invoice.auto_reminders_enabled} className="rounded border-gray-300 text-blue-600" />
          <span className="text-sm text-gray-700">Auto-send reminders when overdue</span>
        </label>
      </div>

      <button type="submit" disabled={isPending} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
