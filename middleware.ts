import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Define truly public routes
  const isPublicRoute =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||  // Auth callbacks
    pathname === '/favicon.ico'

  const isAuthPage = pathname.startsWith('/auth')

  // Allow public routes always
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // SECURITY FIX: Validate fresh session data, not just token existence
  const session = req.auth
  const isLoggedIn = !!session?.user?.id

  // Additional session validation for protected routes
  const isSessionValid = session && session.expires && new Date(session.expires) > new Date()

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isSessionValid && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Allow auth pages for unauthenticated users
  if ((!isLoggedIn || !isSessionValid) && isAuthPage) {
    return NextResponse.next()
  }

  // Protect API routes with strict session validation
  if (pathname.startsWith('/api') && (!isLoggedIn || !isSessionValid)) {
    const errorReason = !isLoggedIn ? 'No valid session' : 'Session expired'
    console.warn(`🔒 API access denied: ${errorReason} for ${pathname}`)

    return NextResponse.json({
      error: 'Unauthorized. Please sign in to access this resource.',
      reason: errorReason
    }, { status: 401 })
  }

  // Protect all other routes with strict session validation
  if (!isLoggedIn || !isSessionValid) {
    const callbackUrl = encodeURIComponent(pathname)
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url)
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}