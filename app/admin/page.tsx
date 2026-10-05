import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { verifySession, ADMIN_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submissions · Dazzlea Admin",
  robots: { index: false, follow: false },
};

type Submission = {
  name: string;
  email: string;
  message: string;
  language: string;
  createdAt: Date;
};

export default async function AdminPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifySession(token)) {
    redirect("/admin/login");
  }

  let rows: Submission[] = [];
  let dbError = false;
  try {
    const db = await getDb();
    const docs = await db
      .collection("submissions")
      .find({}, { projection: { name: 1, email: 1, message: 1, language: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    rows = docs.map((d) => ({
      name: d.name ?? "",
      email: d.email ?? "",
      message: d.message ?? "",
      language: d.language ?? "",
      createdAt: d.createdAt ?? new Date(0),
    }));
  } catch {
    dbError = true;
  }

  return (
    <main className="admin-wrap">
      <header className="admin-top">
        <h1>Submissions</h1>
        <div className="admin-top-right">
          <span className="admin-count">{rows.length} total</span>
          <form method="POST" action="/api/admin/logout">
            <button type="submit" className="admin-logout">Sign out</button>
          </form>
        </div>
      </header>

      {dbError ? (
        <p className="admin-error">Could not load submissions from the database.</p>
      ) : rows.length === 0 ? (
        <p className="admin-empty">No submissions yet.</p>
      ) : (
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Email</th>
                <th>Project</th>
                <th>Lang</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="nowrap">{new Date(r.createdAt).toLocaleString("en-GB")}</td>
                  <td>{r.name}</td>
                  <td>
                    <a href={`mailto:${r.email}`}>{r.email}</a>
                  </td>
                  <td className="msg">{r.message || "—"}</td>
                  <td>{(r.language || "").toUpperCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
