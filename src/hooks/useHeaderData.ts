// src/hooks/useHeaderData.ts
"use client";

import { useState, useEffect } from "react";
import { HeaderItem } from "@/types/menu";
import { getHeaderData, defaultHeaderData } from "@/components/Layout/Header/Navigation/menuData";
import { useLocale } from "@/app/context/LocaleContext";

export function useHeaderData() {
  const { locale } = useLocale();
  const [headerData, setHeaderData] = useState<HeaderItem[]>(defaultHeaderData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeaderData = async () => {
      try {
        const data = await getHeaderData(locale);
        setHeaderData(data);
      } catch (error) {
        console.error("Error fetching header data:", error);
        setHeaderData(defaultHeaderData);
      } finally {
        setLoading(false);
      }
    };

    fetchHeaderData();
  }, [locale]); // ← بيعيد الفetch لما يتغير اللغة

  return { headerData, loading };
}