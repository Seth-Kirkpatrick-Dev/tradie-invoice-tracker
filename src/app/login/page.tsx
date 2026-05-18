import { signIn } from '@/app/actions/auth'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">PaidUp</h1>
          <p className="text-gray-500 mt-1">Get paid faster. Stop chasing invoices.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in</h2>

          <AuthMessages searchParams={searchParams} />

          <form action={signIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Sign in
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            No account?{' '}
            <a href="/signup" className="text-blue-600 hover:underline font-medium">
              Sign up free
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

async function AuthMessages({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const params = await searchParams
  if (params.error) {
    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {params.error}
      </div>
    )
  }
  if (params.message) {
    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
        {params.message}
      </div>
    )
  }
  return null
}
