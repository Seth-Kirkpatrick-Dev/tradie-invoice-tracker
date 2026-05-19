export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-xl font-bold text-gray-900">PaidUp</span>
        <div className="flex items-center gap-4">
          <a href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            Sign in
          </a>
          <a
            href="/signup"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get started free
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
          Get paid faster.
          <br />
          Stop chasing invoices.
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">
          PaidUp tracks your invoices and automatically sends polite reminders to clients
          who are overdue — so you can focus on the job, not the paperwork.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/signup"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl text-base font-medium hover:bg-blue-700 transition-colors"
          >
            Start free — no credit card needed
          </a>
          <a
            href="/login"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-xl text-base font-medium hover:bg-gray-50 transition-colors"
          >
            Sign in
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          Free plan available. Pro from $29 NZD/month.
        </p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Everything a tradie needs to get paid
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          Simple pricing
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Free */}
          <div className="border border-gray-200 rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 text-lg">Free</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              $0
              <span className="text-base font-normal text-gray-500"> / month</span>
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              {freeTier.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="/signup"
              className="mt-6 block text-center border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Get started
            </a>
          </div>

          {/* Pro */}
          <div className="border-2 border-blue-600 rounded-2xl p-6 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
              Most popular
            </span>
            <h3 className="font-bold text-gray-900 text-lg">Pro</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              $29 NZD
              <span className="text-base font-normal text-gray-500"> / month</span>
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              {proTier.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="/signup"
              className="mt-6 block text-center bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Start 14-day free trial
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} PaidUp. Built for tradies who deserve to get paid.</p>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: '📋',
    title: 'Track every invoice',
    description: 'See all your invoices in one place — overdue, due soon, and paid. No more spreadsheets.',
  },
  {
    icon: '🔔',
    title: 'Automatic reminders',
    description: 'PaidUp sends polite reminder emails to late-paying clients on your behalf — automatically.',
  },
  {
    icon: '✅',
    title: 'Mark as paid in one tap',
    description: "When money hits your account, mark the invoice paid instantly. Your dashboard updates in real time.",
  },
  {
    icon: '📄',
    title: 'PDF invoices',
    description: 'Generate a clean, branded PDF invoice for any job. Email it directly to your client.',
  },
  {
    icon: '👥',
    title: 'Client list',
    description: "Your clients are saved as you go. No double entry — their details are always ready.",
  },
  {
    icon: '🌏',
    title: 'NZ, AU, UK & more',
    description: 'Built NZ-first with GST support, but works for tradies anywhere in the world.',
  },
]

const freeTier = [
  'Up to 5 active invoices',
  'Client list',
  'Manual reminder emails',
  'Dashboard overview',
]

const proTier = [
  'Everything in Free',
  'Unlimited invoices',
  'Automatic reminder schedule',
  'Email invoice to client',
  'Custom email templates',
  'Custom branding on PDFs',
]
