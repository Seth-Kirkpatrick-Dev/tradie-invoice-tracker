import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile } from '@/lib/supabase/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import EditInvoiceForm from './EditInvoiceForm'

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [user, profile] = await Promise.all([getUser(), getProfile()])
  if (!user) return null

  const supabase = await createClient()
  const [invRes, clientsRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('clients').select('id, name').eq('user_id', user.id).is('deleted_at', null).order('name'),
  ])

  if (!invRes.data) notFound()
  if (invRes.data.status === 'paid') redirect(`/invoices/${id}`)

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/invoices/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit {invRes.data.invoice_number}</h1>
      </div>
      <EditInvoiceForm invoice={invRes.data} clients={clientsRes.data ?? []} subscriptionTier={profile?.subscription_tier ?? 'free'} />
    </div>
  )
}
