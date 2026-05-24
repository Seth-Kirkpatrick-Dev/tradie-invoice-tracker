'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin')

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/signup?message=Check+your+email+to+confirm+your+account')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function sendPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin')

  const email = formData.get('email') as string
  if (!email) redirect('/forgot-password?error=Email+is+required')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  })

  if (error) redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  redirect('/forgot-password?message=Check+your+email+for+a+reset+link')
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/forgot-password?error=Session+expired.+Request+a+new+reset+link.')

  const password = formData.get('password') as string
  const confirm  = formData.get('confirm')  as string
  if (password !== confirm) redirect('/reset-password?error=Passwords+do+not+match')
  if (password.length < 8) redirect('/reset-password?error=Password+must+be+at+least+8+characters')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`)
  redirect('/dashboard?message=Password+updated+successfully')
}
