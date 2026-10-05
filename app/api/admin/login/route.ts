import { NextResponse } from "next/server";
import { checkPassword, signSession, ADMIN_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") || "");

  if (!checkPassword(password)) {
    return NextResponse.redirect(new URL("/admin/login?error=1", req.url), { status: 303 });
  }

  const res = NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
  res.cookies.set(ADMIN_COOKIE, signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
