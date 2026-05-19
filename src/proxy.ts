import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() reads the cookie — no network call to Supabase
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  const protectedPaths = ['/dashboard', '/invoices', '/clients', '/settings', '/onboarding']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const authPaths = ['/login', '/signup']
  const isAuth = authPaths.some(p => pathname.startsWith(p))
  if (isAuth && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
