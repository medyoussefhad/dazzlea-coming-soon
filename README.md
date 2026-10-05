# Dazzlea — Coming Soon

Production build of the Dazzlea Agency coming-soon landing page. The original
single-file prototype has been rebuilt as a **Next.js (App Router) + TypeScript**
application deployed on **Vercel**, with contact submissions persisted to
**MongoDB** and optional email notifications via **Resend**. The frontend design,
copy, fonts, logo and bilingual (FR/EN) behaviour are preserved exactly from the
prototype.

## Architecture

Single Next.js app (serverless on Vercel — auto-scaling, no servers to manage):

- `app/page.tsx` → renders `components/ComingSoon.tsx` (the landing page).
- `app/api/contact/route.ts` → validates input, rate-limits per IP, stores the
  lead in MongoDB, sends an email notification.
- `app/admin` → password-protected dashboard listing submissions.
- `lib/` → `mongodb.ts` (pooled connection), `validation.ts` (zod), `email.ts`
  (Resend), `auth.ts` (signed-cookie admin session).

Data is stored in the `submissions` collection of the configured database.

## Environment variables

Copy `.env.example` to `.env.local` for local development and set the same
variables in the Vercel project settings.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string (password URL-encoded). |
| `MONGODB_DB` | Database name (default `dazzlea`). |
| `RESEND_API_KEY` | Resend key for email. Empty = email disabled, form still works. |
| `CONTACT_FROM` | Verified sender, e.g. `Dazzlea <contact@dazzlea.agency>`. |
| `CONTACT_TO` | Recipient of new-lead emails. |
| `ADMIN_PASSWORD` | Password for `/admin`. |
| `ADMIN_SESSION_SECRET` | Long random string signing the admin cookie. |

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
```

## Deployment

Deployed via Vercel. Pushing to the default branch triggers a production build.
Ensure all environment variables above are set in the Vercel project, and that
MongoDB Atlas **Network Access** allows Vercel (typically `0.0.0.0/0`).
