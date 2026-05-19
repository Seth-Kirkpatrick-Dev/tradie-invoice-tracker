'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { markAsPaid, updateInvoiceStatus, deleteInvoice } from '@/app/actions/invoices'

export default function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleMarkPaid() {
    startTransition(async () => {
      const result = await markAsPaid(invoiceId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  async function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoiceId, newStatus)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  async function handleDelete() {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteInvoice(invoiceId)
      if (result.error) { setError(result.error); return }
      router.push('/invoices')
    })
  }

  return (
    <div className="space-y-3">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {status !== 'paid' && (
        <button
          onClick={handleMarkPaid}
          disabled={isPending}
          className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          ✓ Mark as paid
        </button>
      )}

      {status === 'draft' && (
        <button
          onClick={() => handleStatusChange('sent')}
          disabled={isPending}
          className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Mark as sent
        </button>
      )}

      {status === 'sent' && (
        <button
          onClick={() => handleStatusChange('overdue')}
          disabled={isPending}
          className="w-full border border-red-300 text-red-600 py-3 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Mark as overdue
        </button>
      )}

      <button
        onClick={handleDelete}
        disabled={isPending}
        className="w-full border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        Delete invoice
      </button>
    </div>
  )
}
