export default async function AdminContentPage() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    // show recent blog posts as content preview
    const res = await fetch(`${base}/api/blog?limit=10`, { cache: "no-store" });
    if (!res.ok) throw new Error("no-blog-api");
    const json = await res.json().catch(() => null);
    const posts = json?.data || json || [];

    return (
      <div>
        <h1 className="text-2xl font-semibold">Content</h1>
        <p className="mt-2 text-sm text-slate-600">Content manager preview ({posts.length} posts)</p>
        <div className="mt-4">
          {posts.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">No posts</div>
          ) : (
            <ul className="space-y-2">
              {posts.map((p: any) => (
                <li key={p.slug || p.id} className="p-2 border rounded bg-white">{p.title}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Content</h1>
        <p className="mt-4 text-sm text-slate-600">Content manager coming soon.</p>
        <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Cannot load blog posts — ensure <code>/api/blog</code> exists.
        </div>
      </div>
    );
  }
}
