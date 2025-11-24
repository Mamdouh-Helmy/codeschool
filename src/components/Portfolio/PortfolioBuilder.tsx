// components/Portfolio/PortfolioBuilder.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PortfolioBuilderUI from "./PortfolioBuilderUI";
import Loader from "@/components/Common/Loader";
import { Portfolio, PortfolioFormData } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

export default function PortfolioBuilder() {
  const { t } = useI18n();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      router.push("/signin");
      return;
    }
    
    // جلب بيانات المستخدم من التوكن
    fetchUserWithToken(token);
  }, [router]);

  const fetchUserWithToken = async (token: string) => {
    try {
      const res = await fetch("/api/users/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Fetch user error:", res.status, text);
        localStorage.removeItem("token");
        router.push("/signin");
        return;
      }

      const data = await res.json();
      if (data?.success && data.user) {
        setUser(data.user);
        fetchPortfolio(token);
      } else {
        localStorage.removeItem("token");
        router.push("/signin");
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      localStorage.removeItem("token");
      router.push("/signin");
    }
  };

  const fetchPortfolio = async (token?: string): Promise<void> => {
    try {
      const currentToken = token || localStorage.getItem("token");
      
      const res = await fetch("/api/portfolio", {
        headers: {
          "Authorization": `Bearer ${currentToken}`,
        },
      });
      
      const data = await res.json();

      if (data.success) {
        setPortfolio(data.portfolio);
      } else {
        // إذا مفيش بورتفليو، ننشئ واحد افتراضي
        const defaultPortfolio: PortfolioFormData = {
          title: t("portfolio.basic.titlePlaceholder"),
          description: "",
          skills: [],
          projects: [],
          socialLinks: {},
          contactInfo: {},
          isPublished: false,
          views: 0,
          settings: {
            theme: "light",
            layout: "standard"
          },
          userId: user?.id || ""
        };
        setPortfolio(defaultPortfolio as Portfolio);
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      toast.error(t("portfolio.status.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const savePortfolio = async (portfolioData: PortfolioFormData): Promise<boolean> => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const method = portfolio?._id ? "PUT" : "POST";
      
      const res = await fetch("/api/portfolio", {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(portfolioData),
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success(t("portfolio.status.saved"));
        setPortfolio(data.portfolio);
        return true;
      } else {
        toast.error(data.message || t("portfolio.status.saveFailed"));
        return false;
      }
    } catch (error) {
      console.error("Error saving portfolio:", error);
      toast.error(t("portfolio.status.saveFailed"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <PortfolioBuilderUI 
      portfolio={portfolio} 
      onSave={savePortfolio} 
      saving={saving} 
    />
  );
}