"use client";
import { useAuth } from "@/hooks/useAuth";

export default function AdminControls({ children }: { children: React.ReactNode }) {
  const { loading, hasRole } = useAuth();
  if (loading) return null;
  if (!hasRole(["admin", "marketing"])) return null;
  return <>{children}</>;
}
