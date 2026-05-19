'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  body: string
  read_at: string | null
  created_at: string
  invoice_id: string | null
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(setNotifications).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unread = notifications.filter(n => !n.read_at)

  async function markAllRead() {
    const ids = unread.map(n => n.id)
    if (!ids.length) return
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }

  function handleOpen() {
    setOpen(o => !o)
    if (!open && unread.length) markAllRead()
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={handleOpen} className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet.</div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {notifications.map(n => (
                <li key={n.id} className={`px-4 py-3 ${!n.read_at ? 'bg-blue-50' : ''}`}>
                  {n.invoice_id ? (
                    <Link href={`/invoices/${n.invoice_id}`} onClick={() => setOpen(false)}>
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                    </Link>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
