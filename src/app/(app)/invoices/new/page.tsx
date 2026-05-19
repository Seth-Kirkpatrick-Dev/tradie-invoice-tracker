import { createClient } from '@/lib/supabase/server'
import NewInvoiceForm from './NewInvoiceForm'
import Link from 'next/link'

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [clientsRes, profileRes] = await Promise.all([
    supabase.from('clients').select('id, name').eq('user_id', user.id).is('deleted_at', null).order('name'),
    supabase.from('profiles').select('currency, tax_rate, tax_label, bank_account_details, subscription_tier').eq('id', user.id).single(),
  ])

  const profile = profileRes.data
  const clients = clientsRes.data ?? []

  // Free tier limit check
  if (profile?.subscription_tier === 'free') {
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['draft', 'sent', 'overdue'])

    if ((count ?? 0) >= 5) {
      return (
        <div className="px-6 py-8 max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <p className="font-semibold text-yellow-900">Free plan limit reached</p>
            <p className="text-sm text-yellow-700 mt-1">You have 5 active invoices. Upgrade to Pro for unlimited invoices.</p>
            <Link href="/settings" className="mt-4 inline-block bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Upgrade to Pro
            </Link>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/invoices" className="text-gray-400 hover:text-gray-600 text-sm">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-900">New invoice</h1>
      </div>
      <NewInvoiceForm
        clients={clients}
        defaultCurrency={profile?.currency ?? 'NZD'}
        defaultTaxRate={profile?.tax_rate ? profile.tax_rate * 100 : 15}
        defaultTaxLabel={profile?.tax_label ?? 'GST'}
        defaultPaymentMethod={profile?.bank_account_details ?? ''}
      />
    </div>
  )
}
