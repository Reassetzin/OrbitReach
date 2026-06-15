import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Not logged in — redirect to login (except login page itself)
  if (!user && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Logged in on login page — redirect to correct dashboard
  if (user && path === '/login') {
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    return NextResponse.redirect(new URL(isAdmin ? '/admin/dashboard' : '/portal/home', request.url))
  }

  // Client trying to access admin routes — block
  if (user && path.startsWith('/admin')) {
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/portal/home', request.url))
    }
  }

  // Admin trying to access portal routes — allow (for preview)
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
