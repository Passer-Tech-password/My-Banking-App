import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME as ADMIN_COOKIE,
  verifySessionEdge as verifyAdminEdge,
} from "@/lib/admin/session-edge";

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};

const ADMIN_LOGIN = "/admin/login";
const ADMIN_DASHBOARD = "/admin/dashboard";

const API_ADMIN_LOGIN = "/api/admin/login";
const API_ADMIN_LOGOUT = "/api/admin/logout";
const API_ADMIN_SESSION = "/api/admin/session";

function pathEndsWith(pathname: string, suffix: string): boolean {
  if (pathname === suffix) return true;
  const stripped = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return stripped === suffix;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/admin/")) {
    if (
      pathEndsWith(pathname, API_ADMIN_LOGIN) ||
      pathEndsWith(pathname, API_ADMIN_LOGOUT) ||
      pathEndsWith(pathname, API_ADMIN_SESSION)
    ) {
      return NextResponse.next();
    }
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const verified = await verifyAdminEdge(token);
    if (!verified.ok) {
      return NextResponse.json({ ok: false as const }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (pathEndsWith(pathname, ADMIN_LOGIN)) {
      const token = req.cookies.get(ADMIN_COOKIE)?.value;
      const verified = await verifyAdminEdge(token);
      if (verified.ok) {
        const url = req.nextUrl.clone();
        url.pathname = ADMIN_DASHBOARD;
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    if (pathname === "/admin" || pathname === "/admin/") {
      const url = req.nextUrl.clone();
      url.pathname = ADMIN_DASHBOARD;
      return NextResponse.redirect(url);
    }

    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const verified = await verifyAdminEdge(token);
    if (!verified.ok) {
      const url = req.nextUrl.clone();
      url.pathname = ADMIN_LOGIN;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}
