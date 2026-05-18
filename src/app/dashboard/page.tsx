import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <form action={signOut}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </form>
        </div>
        <p className="text-gray-600">Coming soon — invoices dashboard.</p>
      </div>
    </div>
  )
}
