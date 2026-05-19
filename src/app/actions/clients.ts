'use server'

import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertClient(formData: FormData) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const id = formData.get('id') as string | null

  const payload = {
    user_id:  user.id,
    name:     (formData.get('name')    as string).trim(),
    email:    (formData.get('email')   as string)?.trim() || null,
    phone:    (formData.get('phone')   as string)?.trim() || null,
    address:  (formData.get('address') as string)?.trim() || null,
    notes:    (formData.get('notes')   as string)?.trim() || null,
  }

  if (id) {
    const { error } = await supabase.from('clients').update(payload).eq('id', id).eq('user_id', user.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('clients').insert(payload)
    if (error) return { error: error.message }
  }

  revalidatePath('/clients')
  return { error: null }
}

export async function deleteClient(id: string) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/clients')
  return { error: error?.message ?? null }
}
