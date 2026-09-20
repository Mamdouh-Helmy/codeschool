// components/Dashboard/hooks/useDashboardData.ts
"use client";
import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "@/lib/api/dashboard";
import { getDashboardData } from "@/lib/api/dashboard";

type State = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
};

export function useDashboardData(locale: "ar" | "en" = "en") {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getDashboardData(locale);
      setState({ data, loading: false, error: null, lastUpdated: new Date() });
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err?.message || "Failed to fetch" }));
    }
  }, [locale]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}