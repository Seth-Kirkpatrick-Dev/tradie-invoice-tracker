const CURRENCY_SYMBOLS: Record<string, string> = {
  NZD: 'NZD $',
  AUD: 'AUD $',
  GBP: '£',
  USD: 'USD $',
}

const COUNTRY_LOCALE: Record<string, string> = {
  NZ: 'en-NZ',
  AU: 'en-AU',
  GB: 'en-GB',
  US: 'en-US',
}

export function countryToLocale(country: string | null | undefined): string {
  return COUNTRY_LOCALE[country ?? ''] ?? 'en-NZ'
}

export function formatCurrency(amount: number, currency = 'NZD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency + ' '
  return `${symbol}${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function daysOverdue(dueDateStr: string | null): number {
  if (!dueDateStr) return 0
  const due  = new Date(dueDateStr).getTime()
  const now  = Date.now()
  return Math.max(0, Math.floor((now - due) / 86400000))
}

export function formatDate(dateStr: string | null, locale = 'en-NZ'): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}
