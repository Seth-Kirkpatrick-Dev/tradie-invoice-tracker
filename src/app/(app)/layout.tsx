import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/auth'
import AppNav from '@/components/AppNav'
import NotificationBell from '@/components/NotificationBell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile()

  if (!profile) redirect('/login')
  if (!profile.onboarding_completed) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      <aside className="hidden md:flex md:flex-col md:w-56 md:fixed md:inset-y-0 bg-white border-r border-gray-200">
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <span className="font-bold text-gray-900 text-lg">PaidUp</span>
            {profile.business_name && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{profile.business_name}</p>
            )}
          </div>
          <NotificationBell />
        </div>
        <AppNav />
      </aside>

      <div className="flex-1 min-w-0 overflow-x-hidden md:ml-56 pb-16 md:pb-0">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:hidden">
          <span className="font-bold text-gray-900">PaidUp</span>
          <NotificationBell />
        </div>
        {children}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-10">
        <AppNav mobile />
      </div>
    </div>
  )
}
