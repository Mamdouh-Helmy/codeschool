// src/app/(dashboard)/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}