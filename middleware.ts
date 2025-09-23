import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
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

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Allow auth pages for unauthenticated users
  if (!isLoggedIn && isAuthPage) {
    return NextResponse.next()
  }

  // Protect API routes (except auth routes already handled above)
  if (pathname.startsWith('/api') && !isLoggedIn) {
    return NextResponse.json({
      error: 'Unauthorized. Please sign in to access this resource.'
    }, { status: 401 })
  }

  // Protect all other routes (including "/")
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