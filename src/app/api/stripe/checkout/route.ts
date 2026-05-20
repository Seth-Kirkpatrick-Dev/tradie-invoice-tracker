import { NextResponse } from 'next/server'

export async function POST() {
  // Wire up when STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID are added
  return NextResponse.json(
    { error: 'Payments are coming soon — check back shortly!' },
    { status: 503 }
  )
}
