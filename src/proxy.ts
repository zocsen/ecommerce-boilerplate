import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

/* ------------------------------------------------------------------ */
/*  Next.js middleware — role-based route protection                    */
/*                                                                     */
/*  Rules:                                                             */
/*  - Guests: public routes only. /profile/*, /admin/*, /agency/*      */
/*    redirect to /login?redirectTo=[url].                             */
/*  - Customers: cannot access /login, /register, /reset-password      */
/*    (redirect to /profile). Cannot access /admin/* or /agency/*      */
/*    (redirect to /profile).                                          */
/*  - Admins/agency_viewer: cannot access /login, /register,           */
/*    /reset-password (redirect to /admin). Cannot access /profile/*   */
/*    (redirect to /admin).                                            */
/*  - /agency/* requires is_agency_owner flag (redirect to             */
/*    /unauthorized).                                                  */
/* ------------------------------------------------------------------ */

const AUTH_ROUTES = ["/login", "/register", "/reset-password"]
const LOGOUT_ROUTE = "/logout"

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // ── Guest (not authenticated) ──────────────────────────────────
  if (!user) {
    // Protected routes require login
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/agency")
    ) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirectTo", pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Guests can access everything else (shop, auth pages, etc.)
    return response
  }

  const isAdmin = user.role === "admin" || user.role === "agency_viewer"

  // ── /logout is always accessible to authenticated users ────────
  if (pathname === LOGOUT_ROUTE) {
    return response
  }

  // ── Authenticated users cannot visit auth pages ────────────────
  if (isAuthRoute(pathname)) {
    const destination = isAdmin ? "/admin" : "/profile"
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // ── Customer role ──────────────────────────────────────────────
  if (!isAdmin) {
    // Customers cannot access admin or agency
    if (pathname.startsWith("/admin") || pathname.startsWith("/agency")) {
      return NextResponse.redirect(new URL("/profile", request.url))
    }
    // Redirect old /account routes to /profile
    if (pathname.startsWith("/account")) {
      const newPath = pathname.replace(/^\/account/, "/profile")
      return NextResponse.redirect(new URL(newPath, request.url))
    }
    return response
  }

  // ── Admin / agency_viewer role ─────────────────────────────────
  if (isAdmin) {
    // Admins cannot access customer profile pages
    if (pathname.startsWith("/profile")) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    // Redirect old /account routes to /admin
    if (pathname.startsWith("/account")) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    // /agency/* requires is_agency_owner flag
    if (pathname.startsWith("/agency") && !user.isAgencyOwner) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - Public files (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
