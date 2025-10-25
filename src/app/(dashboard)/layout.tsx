import type { ReactNode } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  let user = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (token) {
      const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const res = await fetch(`${base}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json();
      if (res.ok && json?.success) {
        user = json.user;
      }
    }
  } catch (err) {
    console.error("Error fetching user for admin layout:", err);
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}