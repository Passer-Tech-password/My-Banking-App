import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const verified = verifySession(token);
  if (!verified.ok) {
    return NextResponse.json(
      { ok: false as const, authenticated: false },
      { status: 401 },
    );
  }
  return NextResponse.json({
    ok: true as const,
    authenticated: true,
    email: verified.email,
  });
}
