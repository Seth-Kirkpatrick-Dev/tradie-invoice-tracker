import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, business_name, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <span className="font-bold text-gray-900">PaidUp</span>
            {profile.business_name && (
              <span className="ml-2 text-sm text-gray-500">— {profile.business_name}</span>
            )}
          </div>
          <form action={signOut}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          G&apos;day{profile.first_name ? `, ${profile.first_name}` : ''}!
        </h1>
        <p className="text-gray-500 mb-8">Here&apos;s what&apos;s happening with your invoices.</p>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Overdue', value: '$0.00', color: 'text-red-600' },
            { label: 'Due soon', value: '$0.00', color: 'text-yellow-600' },
            { label: 'Paid this month', value: '$0.00', color: 'text-green-600' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">No invoices yet.</p>
          <button className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Add your first invoice
          </button>
        </div>
      </main>
    </div>
  )
}
