import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/auth'
import ClientsClient from './ClientsClient'

export default async function ClientsPage() {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, email, phone, address, notes')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('name')

  return <ClientsClient clients={clients ?? []} />
}
