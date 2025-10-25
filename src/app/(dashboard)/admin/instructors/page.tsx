export default async function AdminInstructorsPage() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    // repo doesn't have a dedicated instructors API; try /api/users?role=instructor if available
    const url = `${base}/api/users?role=instructor`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("no-users-api");
    const json = await res.json().catch(() => null);
    const ins = json?.data || json || [];
    return (
      <div>
        <h1 className="text-2xl font-semibold">Instructors</h1>
        <p className="mt-2 text-sm text-slate-600">Instructors ({ins.length})</p>
        <div className="mt-4">
          {ins.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">No instructors found.</div>
          ) : (
            <ul className="space-y-2">
              {ins.map((i: any) => (
                <li key={i.id || i._id} className="p-2 border rounded bg-white">{i.name || i.email}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Instructors</h1>
        <p className="mt-4 text-sm text-slate-600">Instructors management coming soon.</p>
        <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">No users API found at <code>/api/users</code> or it doesn't accept role query.</div>
      </div>
    );
  }
}
