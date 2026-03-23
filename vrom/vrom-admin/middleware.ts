import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login page without auth
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // Allow API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // For now, allow all routes (you can add auth checks here)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
