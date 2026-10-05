import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { contactSchema } from "@/lib/validation";
import { sendLeadNotification } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    // Honeypot or validation failure — return a generic 400.
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const ip = clientIp(req);

  try {
    const db = await getDb();
    const submissions = db.collection("submissions");

    // Best-effort per-IP rate limit.
    if (ip !== "unknown") {
      const since = new Date(Date.now() - RATE_WINDOW_MS);
      const recent = await submissions.countDocuments({ ip, createdAt: { $gte: since } });
      if (recent >= RATE_MAX) {
        return NextResponse.json(
          { ok: false, error: "Too many requests. Please try again shortly." },
          { status: 429 },
        );
      }
    }

    await submissions.insertOne({
      name: data.name,
      email: data.email,
      message: data.message,
      language: data.language,
      ip,
      userAgent: req.headers.get("user-agent") || "",
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("DB insert error:", err);
    return NextResponse.json(
      { ok: false, error: "Could not save your message. Please try again." },
      { status: 500 },
    );
  }

  // Email is best-effort: a failure here should not fail the submission.
  try {
    await sendLeadNotification(data);
  } catch (err) {
    console.error("Email send error:", err);
  }

  return NextResponse.json({ ok: true });
}
