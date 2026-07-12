import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas
  if (pathname === "/login" || pathname === "/sem-acesso" || pathname.startsWith("/api/auth") || pathname.startsWith("/portal") || pathname.startsWith("/api/portal")) {
    return NextResponse.next()
  }

  // Todas as outras exigem login
  const authMiddleware = withMiddlewareAuthRequired({
    returnTo: "/dashboard",
  })

  return authMiddleware(request, {} as any)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
