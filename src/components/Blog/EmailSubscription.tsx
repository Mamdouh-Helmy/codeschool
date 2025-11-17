// src/components/Blog/EmailSubscription.tsx
"use client";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Mail, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function EmailSubscription() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/blog/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSubscribed(true);
        setEmail("");
        toast.success(t("blog.subscribeSuccess") || "Successfully subscribed to newsletter!");
      } else {
        if (data.message === "Email already subscribed") {
          toast.error(t("blog.alreadySubscribed") || "You are already subscribed!");
        } else {
          toast.error(t("blog.subscribeError") || "Failed to subscribe. Please try again.");
        }
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error(t("blog.subscribeError") || "Failed to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="bg-Aquamarine/10 border border-Aquamarine/30 rounded-lg p-4 text-center">
        <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-Salem mx-auto mb-2" />
        <p className="text-Salem font-semibold text-sm md:text-base">
          {t("blog.subscribeSuccess") || "Successfully subscribed to newsletter!"}
        </p>
        <p className="text-SlateBlueText text-xs md:text-sm mt-1">
          Thank you for subscribing!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-IcyBreeze dark:bg-dark_input rounded-lg p-4 md:p-6 border border-PowderBlueBorder dark:border-dark_border">
      <div className="flex items-start md:items-center gap-3 mb-4">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Mail className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-MidnightNavyText dark:text-white text-sm md:text-base">
            {t("blog.subscribe") || "Subscribe to Newsletter"}
          </h3>
          <p className="text-xs md:text-sm text-SlateBlueText dark:text-darktext mt-1">
            {t("blog.subscribeDescription") || "Get the latest blog posts delivered to your inbox"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubscribe} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("blog.emailPlaceholder") || "Enter your email address"}
            className="flex-1 px-3 py-2 border border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkmode dark:text-white text-sm min-w-0"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Mail className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{t("blog.subscribeButton") || "Subscribe"}</span>
            <span className="sm:hidden">{t("blog.subscribe") || "Subscribe"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}