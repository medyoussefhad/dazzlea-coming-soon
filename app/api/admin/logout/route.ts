import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
