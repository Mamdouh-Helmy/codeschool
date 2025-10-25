export default async function AdminBillingPage() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/subscriptions`, { cache: "no-store" });
    if (!res.ok) throw new Error("no-subscriptions-api");
    const json = await res.json().catch(() => null);
    const subs = json?.data || json || [];

    return (
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-2 text-sm text-slate-600">Subscriptions ({subs.length})</p>
        <div className="mt-4 space-y-2">
          {subs.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">No subscriptions found.</div>
          ) : (
            <table className="w-full table-auto bg-white rounded border">
              <thead>
                <tr className="text-left">
                  <th className="p-2">User</th>
                  <th className="p-2">Plan</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s: any) => (
                  <tr key={s.id || s._id} className="border-t">
                    <td className="p-2">{s.user?.name || s.user?.email || s.user}</td>
                    <td className="p-2">{s.plan?.name || s.plan}</td>
                    <td className="p-2">{s.isActive ? "Active" : "Disabled"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-4 text-sm text-slate-600">Billing and invoices will appear here.</p>
        <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Cannot load subscriptions — ensure the backend endpoint <code>/api/subscriptions</code> exists and returns JSON.
        </div>
      </div>
    );
  }
}
