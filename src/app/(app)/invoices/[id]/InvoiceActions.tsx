'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { markAsPaid, updateInvoiceStatus, deleteInvoice, emailInvoiceToClient } from '@/app/actions/invoices'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function InvoiceActions({
  invoiceId, status, clientEmail,
}: {
  invoiceId: string
  status: string
  clientEmail: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  async function handleEmail() {
    setEmailSuccess(false)
    setError('')
    startTransition(async () => {
      const result = await emailInvoiceToClient(invoiceId)
      if (result.error) setError(result.error)
      else setEmailSuccess(true)
    })
  }

  function handleDeleteConfirmed() {
    setShowDeleteConfirm(false)
    startTransition(async () => {
      const result = await deleteInvoice(invoiceId)
      if (result.error) { setError(result.error); return }
      router.push('/invoices')
    })
  }

  return (
    <>
      <div className="space-y-3">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        {emailSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Invoice emailed to client.
          </div>
        )}

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

        {clientEmail && status !== 'paid' && (
          <button
            onClick={handleEmail}
            disabled={isPending}
            className="w-full border border-blue-300 text-blue-600 py-3 rounded-xl text-sm font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Sending…' : `Email invoice to client`}
          </button>
        )}

        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
          className="w-full border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Delete invoice
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete invoice?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
