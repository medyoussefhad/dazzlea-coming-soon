import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin · Dazzlea",
  robots: { index: false, follow: false },
};

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="admin-auth">
      <form className="admin-card" method="POST" action="/api/admin/login">
        <h1>Dazzlea Admin</h1>
        <p className="admin-sub">Enter the admin password to view submissions.</p>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
        {error ? <p className="admin-error">Incorrect password.</p> : null}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
