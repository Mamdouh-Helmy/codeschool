import React from "react";

export default async function AdminStudentsPage() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/users`, { cache: "no-store" });
    if (!res.ok) throw new Error("no-users-api");
    const json = await res.json().catch(() => null);
    const students = json?.data || json || [];

    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Students</h1>
          <button className="btn btn-primary">New Student</button>
        </div>
        <div className="mt-4">
          {students.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">No students yet — the backend returned no users.</div>
          ) : (
            <ul className="space-y-2">
              {students.map((s: any) => (
                <li key={s.id || s._id}>{s.name || s.email}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Students</h1>
          <button className="btn btn-primary">New Student</button>
        </div>
        <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">Backend users API not available — create <code>/api/users</code> to show students here.</div>
      </div>
    );
  }
}
