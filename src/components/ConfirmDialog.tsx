'use client'

import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmClassName?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm',
  confirmClassName = 'bg-red-600 hover:bg-red-700 text-white',
  onConfirm, onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
