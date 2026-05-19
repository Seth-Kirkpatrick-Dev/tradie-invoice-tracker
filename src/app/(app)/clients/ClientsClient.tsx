'use client'

import { useState, useTransition, useEffect } from 'react'
import { upsertClient, deleteClient } from '@/app/actions/clients'
import { useSupabase } from '@/hooks/useSupabase'
import { UserPlus, Pencil, Trash2, X } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
}

export default function ClientsClient({ clients: initialClients }: { clients: Client[] | null }) {
  const supabase = useSupabase()
  const [clients, setClients] = useState<Client[] | null>(initialClients)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (initialClients !== null) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('clients')
        .select('id, name, email, phone, address, notes')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name')
      setClients((data ?? []) as Client[])
    }
    load()
  }, [supabase, initialClients])

  function openAdd() { setEditing(null); setError(''); setShowModal(true) }
  function openEdit(c: Client) { setEditing(c); setError(''); setShowModal(true) }
  function closeModal() { setShowModal(false); setEditing(null); setError('') }

  async function refreshClients() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clients').select('id, name, email, phone, address, notes')
      .eq('user_id', user.id).is('deleted_at', null).order('name')
    setClients((data ?? []) as Client[])
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await upsertClient(formData)
      if (result.error) { setError(result.error); return }
      closeModal()
      await refreshClients()
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}? Their invoices will be kept.`)) return
    startTransition(async () => {
      await deleteClient(id)
      await refreshClients()
    })
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <UserPlus size={16} /> Add client
        </button>
      </div>

      {clients === null ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center justify-between px-5 py-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 w-36 bg-gray-200 rounded" />
                <div className="h-3 w-48 bg-gray-100 rounded" />
              </div>
              <div className="h-6 w-14 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">No clients yet.</p>
          <button onClick={openAdd} className="mt-3 text-blue-600 text-sm hover:underline">
            Add your first client →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {clients.map(c => (
            <div key={c.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">{editing ? 'Edit client' : 'Add client'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

            <form action={handleSubmit} className="space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input name="name" type="text" required defaultValue={editing?.name} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Jim's Plumbing" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input name="email" type="email" defaultValue={editing?.email ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="jim@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input name="phone" type="tel" defaultValue={editing?.phone ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+64 21 000 0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input name="address" type="text" defaultValue={editing?.address ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="123 Main St, Auckland" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="notes" rows={2} defaultValue={editing?.notes ?? ''} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {isPending ? 'Saving…' : editing ? 'Save changes' : 'Add client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
