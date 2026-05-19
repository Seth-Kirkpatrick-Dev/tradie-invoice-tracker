import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppNav from '@/components/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white border-r border-gray-200">
        <div className="px-4 py-5 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-lg">PaidUp</span>
          {profile.business_name && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{profile.business_name}</p>
          )}
        </div>
        <AppNav />
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56 pb-16 md:pb-0">
        {children}
      </div>

      {/* Bottom nav — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-10">
        <AppNav mobile />
      </div>
    </div>
  )
}
