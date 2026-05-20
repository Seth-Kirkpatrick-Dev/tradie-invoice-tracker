import { getUser, getProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import { Check } from 'lucide-react'
import Link from 'next/link'
import UpgradeButton from './UpgradeButton'

const FREE_FEATURES = [
  'Up to 5 active invoices',
  'Client management',
  'PDF / print invoices',
  'Business logo',
]

const PRO_FEATURES = [
  'Unlimited invoices',
  'Automatic email reminders',
  'Custom reminder email template',
  'Everything in Free',
]

export default async function UpgradePage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const isPro = ['pro', 'pro_plus'].includes(profile.subscription_tier ?? '')

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Plans</h1>
      <p className="text-gray-500 text-sm mb-8">
        {isPro
          ? "You're on Pro. Thanks for supporting PaidUp."
          : 'Upgrade to unlock unlimited invoices and automatic reminders.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Free */}
        <div className={`bg-white rounded-xl border p-6 ${!isPro ? 'border-gray-300' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Free</h2>
            {!isPro && (
              <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2.5 py-1 rounded-full">Current plan</span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">$0</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">forever</p>
          <ul className="space-y-2.5">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                <Check size={15} className="mt-0.5 text-gray-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className={`bg-white rounded-xl border p-6 ${isPro ? 'border-blue-500 ring-2 ring-blue-100' : 'border-blue-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Pro</h2>
            {isPro && (
              <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2.5 py-1 rounded-full">Current plan</span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">$19</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">per month</p>
          <ul className="space-y-2.5 mb-6">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                <Check size={15} className="mt-0.5 text-blue-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {!isPro && <UpgradeButton />}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Billed monthly · Cancel any time ·{' '}
        <Link href="/settings" className="underline">Back to settings</Link>
      </p>
    </div>
  )
}
