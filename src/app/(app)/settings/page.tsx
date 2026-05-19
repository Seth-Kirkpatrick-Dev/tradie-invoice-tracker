import { getUser, getProfile } from '@/lib/supabase/auth'
import SettingsForm from './SettingsForm'
import { signOut } from '@/app/actions/auth'

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()])
  if (!user || !profile) return null

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
        <p className="text-sm text-gray-500 mb-4">Signed in as <span className="font-medium text-gray-700">{user.email}</span></p>
        <form action={signOut}>
          <button type="submit" className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">Sign out</button>
        </form>
      </div>

      <SettingsForm profile={profile} userId={user.id} />
    </div>
  )
}
