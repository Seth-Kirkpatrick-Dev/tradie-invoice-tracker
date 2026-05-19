import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'overdue' })
    .in('status', ['sent', 'draft'])
    .lt('due_date', today)
    .not('due_date', 'is', null)
    .select('id')

  if (error) {
    console.error('mark-overdue cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`mark-overdue: updated ${data?.length ?? 0} invoices`)
  return NextResponse.json({ updated: data?.length ?? 0 })
}
