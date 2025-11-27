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
        // إذا مفيش بورتفليو، ننشئ واحد افتراضي مع السمة المظلمة
        console.log("🔄 No portfolio found, creating default with dark theme...");
        const defaultPortfolio: PortfolioFormData = {
          title: t("portfolio.basic.titlePlaceholder"),
          description: "",
          skills: [
            {
              name: "JavaScript",
              level: 75,
              category: "Frontend",
              icon: "🟨"
            },
            {
              name: "React",
              level: 70,
              category: "Frontend", 
              icon: "⚛️"
            }
          ],
          projects: [
            {
              title: "Portfolio Website",
              description: "A modern and responsive portfolio website to showcase my work and skills.",
              technologies: ["Next.js", "React", "Tailwind CSS"],
              status: "completed",
              featured: true,
              startDate: new Date(),
              endDate: new Date(),
            },
          ],
          socialLinks: {
            github: `https://github.com/${user?.username}`,
            linkedin: `https://linkedin.com/in/${user?.username}`
          },
          contactInfo: {},
          isPublished: false,
          views: 0,
          settings: {
            theme: "dark", // 🔥 السمة المظلمة كإعداد افتراضي
            layout: "standard"
          },
          userId: user?.id || ""
        };
        setPortfolio(defaultPortfolio as Portfolio);
        
        // محاولة حفظ البورتفليو الافتراضي
        try {
          const saveRes = await fetch("/api/portfolio", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${currentToken}`,
            },
            body: JSON.stringify(defaultPortfolio),
          });
          
          if (saveRes.ok) {
            const savedData = await saveRes.json();
            setPortfolio(savedData.portfolio);
            console.log("✅ Default portfolio saved successfully");
          }
        } catch (saveError) {
          console.error("❌ Could not save default portfolio:", saveError);
        }
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