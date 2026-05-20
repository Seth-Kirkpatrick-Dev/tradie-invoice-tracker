'use client'

import { useState } from 'react'

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpgrade() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Redirecting…' : 'Upgrade to Pro →'}
      </button>
    </div>
  )
}
