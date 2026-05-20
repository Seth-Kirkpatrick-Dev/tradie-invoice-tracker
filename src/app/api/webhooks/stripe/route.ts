import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Wire up when STRIPE_WEBHOOK_SECRET is added
  // Steps:
  // 1. Verify signature with stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  // 2. Handle checkout.session.completed → set subscription_tier = 'pro', save stripe IDs
  // 3. Handle customer.subscription.deleted → set subscription_tier = 'free'
  return NextResponse.json({ received: true })
}
