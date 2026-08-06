"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import PortfolioBuilderUI from "./PortfolioBuilderUI";
import { Portfolio, PortfolioFormData } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

const DEFAULT_STATS = { yearsOfExperience: 0, codeCommits: 0 };

function PortfolioLoader() {
  return (
    <>
      <style>{`
        @keyframes pb-spin  { to { transform: rotate(360deg); } }
        @keyframes pb-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .pb-loader-shell {
          min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: #0a0f17; gap: 18px;
        }
        .pb-loader-ring {
          width: 44px; height: 44px;
          border: 3px solid #30363d;
          border-top-color: #ff6700;
          border-radius: 50%;
          animation: pb-spin .75s linear infinite;
        }
        .pb-loader-text {
          font-size: 13px; color: #8b949e;
          font-family: system-ui, sans-serif;
          animation: pb-pulse 1.6s ease-in-out infinite;
        }
        .pb-loader-dots { display: inline-flex; gap: 4px; margin-top: 4px; }
        .pb-loader-dot  {
          width: 5px; height: 5px; border-radius: 50%;
          background: #ff6700; animation: pb-pulse 1.2s ease-in-out infinite;
        }
        .pb-loader-dot:nth-child(2) { animation-delay: .2s; }
        .pb-loader-dot:nth-child(3) { animation-delay: .4s; }
      `}</style>
      <div className="pb-loader-shell">
        <div className="pb-loader-ring" />
        <div>
          <div className="pb-loader-text">Loading your portfolio</div>
          <div className="pb-loader-dots">
            <span className="pb-loader-dot" />
            <span className="pb-loader-dot" />
            <span className="pb-loader-dot" />
          </div>
        </div>
      </div>
    </>
  );
}

export default function PortfolioBuilder() {
  const { t } = useI18n();
  const { data: session, status } = useSession(); // ✅ بدل localStorage
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // لسه بيحمل الـ session، ماتعملش حاجة

    if (status === "unauthenticated") {
      router.push("/signin?redirect=/portfolio/builder");
      return;
    }

    if (status === "authenticated" && session?.user) {
      fetchPortfolio(session.user);
    }
  }, [status, session]);

  /* ── Fetch (or create) portfolio ────────────────────────────── */
  const fetchPortfolio = async (userData: any): Promise<void> => {
    try {
      // ✅ الكوكي بتتبعت أوتوماتيك، مش محتاجين Authorization header
      const res = await fetch("/api/portfolio", { credentials: "include" });
      const data = await res.json();

      if (data.success && data.portfolio) {
        setPortfolio({
          ...data.portfolio,
          certificates: data.portfolio.certificates || [],
          cvUrl: data.portfolio.cvUrl || "",
          stats: data.portfolio.stats || DEFAULT_STATS,
          userId: data.portfolio.userId || userData,
        });
      } else {
        const defaultPortfolio: PortfolioFormData = {
          title: t("portfolio.basic.titlePlaceholder"),
          description: "",
          ownerRole: (userData as any)?.profile?.jobTitle || "",
          ownerImage: userData?.image || "",
          cvUrl: "",
          stats: DEFAULT_STATS,
          skills: [
            { name: "JavaScript", level: 75, category: "Frontend", icon: "🟨" },
            { name: "React", level: 70, category: "Frontend", icon: "⚛️" },
          ],
          projects: [
            {
              title: "Portfolio Website",
              description:
                "A modern and responsive portfolio website to showcase my work and skills.",
              technologies: ["Next.js", "React", "Tailwind CSS"],
              status: "completed",
              featured: true,
              startDate: new Date(),
              endDate: new Date(),
              images: [],
            },
          ],
          certificates: [],
          experience: [],
          education: [],
          services: [],
          socialLinks: {
            github: `https://github.com/${(userData as any)?.username || ""}`,
            linkedin: `https://linkedin.com/in/${(userData as any)?.username || ""}`,
          },
          contactInfo: {
            email: userData?.email || "",
            phone: (userData as any)?.phone || "",
            location: (userData as any)?.location || "",
          },
          isPublished: false,
          views: 0,
          settings: { theme: "dark", layout: "standard" },
          userId: (userData as any)?.id || "",
        };

        setPortfolio(defaultPortfolio as Portfolio);

        try {
          const saveRes = await fetch("/api/portfolio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // ✅ بدل Authorization Bearer
            body: JSON.stringify(defaultPortfolio),
          });
          const saved = await saveRes.json();
          if (saved.success && saved.portfolio) {
            setPortfolio({
              ...saved.portfolio,
              certificates: saved.portfolio.certificates || [],
              cvUrl: saved.portfolio.cvUrl || "",
              stats: saved.portfolio.stats || DEFAULT_STATS,
              userId: saved.portfolio.userId || userData,
            });
          }
        } catch (saveErr) {
          console.error("Could not save default portfolio:", saveErr);
        }
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      toast.error(t("portfolio.status.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  /* ── Save portfolio ─────────────────────────────────────────── */
  const savePortfolio = async (portfolioData: PortfolioFormData): Promise<boolean> => {
    setSaving(true);
    try {
      const portfolioId = (portfolio as any)?._id || (portfolio as any)?.id;
      const method = portfolioId ? "PUT" : "POST";

      const payload: PortfolioFormData = {
        ...portfolioData,
        certificates: portfolioData.certificates || [],
        cvUrl: portfolioData.cvUrl || "",
        stats: portfolioData.stats || DEFAULT_STATS,
      };

      const res = await fetch("/api/portfolio", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ بدل Authorization Bearer
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(t("portfolio.status.saved"));
        setPortfolio({
          ...data.portfolio,
          certificates: data.portfolio.certificates || [],
          cvUrl: data.portfolio.cvUrl || "",
          stats: data.portfolio.stats || DEFAULT_STATS,
          userId: data.portfolio.userId || session?.user,
        });
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

  if (status === "loading" || loading) return <PortfolioLoader />;

  return (
    <PortfolioBuilderUI portfolio={portfolio} onSave={savePortfolio} saving={saving} />
  );
}