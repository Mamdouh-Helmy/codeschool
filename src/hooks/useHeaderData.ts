// src/hooks/useHeaderData.ts
import { useState, useEffect } from 'react';
import { HeaderItem } from '@/types/menu';
import { getHeaderData, defaultHeaderData } from '@/components/Layout/Header/Navigation/menuData';

export function useHeaderData() {
  const [headerData, setHeaderData] = useState<HeaderItem[]>(defaultHeaderData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeaderData = async () => {
      try {
        const data = await getHeaderData();
        setHeaderData(data);
      } catch (error) {
        console.error('Error fetching header data:', error);
        setHeaderData(defaultHeaderData);
      } finally {
        setLoading(false);
      }
    };

    fetchHeaderData();
  }, []);

  return { headerData, loading };
} 