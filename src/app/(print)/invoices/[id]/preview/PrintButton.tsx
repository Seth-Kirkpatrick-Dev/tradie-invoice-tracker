'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed bottom-6 right-6 bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors"
    >
      Print / Save PDF
    </button>
  )
}
