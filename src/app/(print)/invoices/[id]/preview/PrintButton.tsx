'use client'

import Link from 'next/link'

export default function PrintButton({ invoiceId }: { invoiceId: string }) {
  return (
    <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link
        href={`/invoices/${invoiceId}`}
        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        ← Back
      </Link>
      <button
        onClick={() => window.print()}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Print / Save PDF
      </button>
    </div>
  )
}
