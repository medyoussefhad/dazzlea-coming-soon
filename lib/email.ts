import { Resend } from "resend";
import type { ContactInput } from "./validation";

/**
 * Sends a new-lead notification via Resend.
 * No-op (returns false) when RESEND_API_KEY is not configured, so the contact
 * form keeps working even before email is set up.
 */
export async function sendLeadNotification(lead: ContactInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.CONTACT_FROM || "Dazzlea <onboarding@resend.dev>";
  const to = process.env.CONTACT_TO || "contact@dazzlea.agency";

  const resend = new Resend(apiKey);

  const safe = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

  const subject = `New project enquiry — ${lead.name}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111">
      <h2 style="margin:0 0 12px">New enquiry from the Dazzlea site</h2>
      <p style="margin:4px 0"><strong>Name:</strong> ${safe(lead.name)}</p>
      <p style="margin:4px 0"><strong>Email:</strong> <a href="mailto:${safe(lead.email)}">${safe(lead.email)}</a></p>
      <p style="margin:4px 0"><strong>Language:</strong> ${lead.language.toUpperCase()}</p>
      <p style="margin:12px 0 4px"><strong>Project:</strong></p>
      <p style="margin:0;white-space:pre-wrap">${safe(lead.message || "—")}</p>
    </div>`;

  const text = `New enquiry from the Dazzlea site
Name: ${lead.name}
Email: ${lead.email}
Language: ${lead.language.toUpperCase()}

Project:
${lead.message || "—"}`;

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: lead.email,
    subject,
    html,
    text,
  });

  if (error) {
    console.error("Resend error:", error);
    return false;
  }
  return true;
}
