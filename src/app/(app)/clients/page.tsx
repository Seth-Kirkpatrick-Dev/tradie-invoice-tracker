import { createClient } from '@/lib/supabase/server'
import ClientsClient from './ClientsClient'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, phone, address, notes')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('name')

  return <ClientsClient clients={clients ?? []} />
}
