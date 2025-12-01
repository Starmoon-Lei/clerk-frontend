import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Auth callbacks
  const isPublicRoute = pathname.startsWith('/api/auth')

  const isAuthPage = pathname.startsWith('/auth')

  // Allow public routes always
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Validate fresh session data
  const session = req.auth
  const isLoggedIn = !!(session?.user?.id)
  const isSessionExpired = session && session.expires && new Date(session.expires) < new Date()

  // Redirect expired sessions to signin
  if (isSessionExpired) {
    const callbackUrl = encodeURIComponent(pathname)
    const response = NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${callbackUrl}&expired=true`, req.url)
    )
  }

  // Allow unauthenticated users to access auth pages
  if (!isLoggedIn && isAuthPage) {
    return NextResponse.next()
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Return JSON 401 for unauthenticated API requests
  if (pathname.startsWith('/api') && !isLoggedIn) {
    return NextResponse.json({
      error: 'Unauthorized. Please sign in to access this resource.',
      reason: 'No valid session'
    }, { status: 401 })
  }

  // Redirect to signin page if not logged in
  if (!isLoggedIn) {
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