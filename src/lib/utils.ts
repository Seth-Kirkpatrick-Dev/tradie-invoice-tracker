const CURRENCY_SYMBOLS: Record<string, string> = {
  NZD: 'NZD $',
  AUD: 'AUD $',
  GBP: '£',
  USD: 'USD $',
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

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}
