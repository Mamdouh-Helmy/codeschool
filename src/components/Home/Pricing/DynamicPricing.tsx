"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

type PricingPlan = {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
};

const DynamicPricing = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribedPlans, setSubscribedPlans] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const { t } = useI18n();
  const planIdFromQuery = searchParams.get("plan");
  const { locale } = useLocale();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/pricing", { cache: "no-store" });
        const result = await res.json();

        if (result.success && result.data?.length > 0) {
          setPlans(result.data);
        } else {
          setError(t("pricing.noPlans"));
        }
      } catch (err) {
        console.error("Fetch pricing error:", err);
        setError(t("pricing.loadError"));
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [t]);

  useEffect(() => {
    if (planIdFromQuery) setSelectedPlan(planIdFromQuery);
  }, [planIdFromQuery]);

  useEffect(() => {
    const fetchUserSubscriptions = async () => {
      try {
        const res = await fetch("/api/subscriptions", { cache: "no-store" });
        if (!res.ok) return;
        const result = await res.json();
        if (result.success && result.data?.length > 0) {
          const userSubs = result.data
            .filter((sub: any) => sub.status !== "cancelled")
            .map((sub: any) => sub.plan?._id || sub.plan);
          setSubscribedPlans(userSubs);
        }
      } catch (error) {
        console.error("Error fetching user subscriptions:", error);
      }
    };

    fetchUserSubscriptions();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (subscribedPlans.includes(planId)) {
      toast.error(t("eventTicket.alreadySubscribed"));
      return;
    }

    if (!auth?.isAuthenticated) {
      try {
        const sess = await fetch("/api/auth/session", { cache: "no-store" });
        if (sess.ok) {
          const sessJson = await sess.json();
          if (sessJson?.success && sessJson?.loggedIn) {
            // المستخدم مسجل دخول - نواصل العملية
          } else {
            toast.error(t("eventTicket.pleaseLogin"));
            const callback = pathname || "/";
            router.push(
              `/signin?callbackUrl=${encodeURIComponent(callback)}&plan=${planId}`
            );
            return;
          }
        } else {
          toast.error(t("eventTicket.pleaseLogin"));
          const callback = pathname || "/";
          router.push(
            `/signin?callbackUrl=${encodeURIComponent(callback)}&plan=${planId}`
          );
          return;
        }
      } catch (e) {
        console.error("Session check failed:", e);
        toast.error(t("eventTicket.pleaseLogin"));
        const callback = pathname || "/";
        router.push(
          `/signin?callbackUrl=${encodeURIComponent(callback)}&plan=${planId}`
        );
        return;
      }
    }

    // بعد التأكد من تسجيل الدخول، نوجه إلى الواتساب
    try {
      setProcessing(true);

      // البحث عن الخطة المختارة
      const selectedPlan = plans.find(p => p._id === planId || p.id === planId);

      if (!selectedPlan) {
        toast.error(t("pricing.planNotFound") || "الخطة غير موجودة");
        return;
      }

      // إنشاء رسالة الواتساب
      const message = `مرحباً، أريد الاشتراك في الخطة التالية:%0A%0A*الخطة المختارة:* ${selectedPlan.name}%0A*السعر:* ${selectedPlan.price} ${selectedPlan.currency}%0A*مدة الاشتراك:* ${selectedPlan.billingPeriod === 'monthly' ? 'شهري' : selectedPlan.billingPeriod === 'yearly' ? 'سنوي' : selectedPlan.billingPeriod}%0A*وصف الخطة:* ${selectedPlan.description}%0A%0Aيرجى التواصل معي لإكمال عملية الاشتراك والدفع.`;

      // رقم الواتساب
      const whatsappNumber = "+201110050892";

      // رابط الواتساب
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

      // فتح الواتساب في نافذة جديدة
      window.open(whatsappUrl, '_blank');

      toast.success(t("pricing.redirectingToWhatsApp") || "جاري التوجيه إلى الواتساب...");

    } catch (err) {
      toast.error(t("pricing.redirectError") || "حدث خطأ أثناء التوجيه للواتساب");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading)
    return (
      <div className="py-20 text-center text-gray-500">
        {t("pricing.loading")}
      </div>
    );

  if (error)
    return <div className="py-20 text-center text-red-500">{error}</div>;

  return (
    <section className="bg-LightSkyBlue dark:bg-darklight py-20 mt-6">
      <Toaster position="top-center" />
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const isSelected =
              selectedPlan === plan.id || selectedPlan === plan._id;
            const isSubscribed = subscribedPlans.includes(plan._id || plan.id!);

            return (
              <div
                key={plan._id || plan.id}
                className={`relative bg-white dark:bg-darkmode rounded-2xl shadow-lg p-8 transition-all ${isSelected
                  ? "ring-4 ring-primary scale-105"
                  : "hover:shadow-xl"
                  }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {t("common.selected")}
                  </div>
                )}

                <h3 className="text-2xl font-bold text-center mb-3">
                  {plan.name}
                </h3>
                <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
                  {plan.description}
                </p>
                {locale === "ar" ? (
                  <p className="text-center text-4xl font-bold text-primary mb-6">
                    <span className="text-gray-500 text-base ml-1">
                      {plan.billingPeriod} /
                    </span>{" "}
                    {plan.price} {plan.currency}
                  </p>
                ) : (
                  <p className="text-center text-4xl font-bold text-primary mb-6">
                    {plan.price} {plan.currency}
                    <span className="text-gray-500 text-base ml-1">
                      / {plan.billingPeriod}
                    </span>
                  </p>
                )}

                {isSubscribed ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span>{t("eventTicket.subscribed")}</span>
                  </button>
                ) : isSelected ? (
                  <button
                    onClick={() => handleSubscribe(plan._id!)}
                    disabled={processing}
                    className={`w-full py-3 rounded-lg font-semibold transition ${processing
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary/90"
                      }`}
                  >
                    {processing
                      ? t("eventTicket.processing")
                      : t("pricing.subscribe")}
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedPlan(plan._id!)}
                    disabled={processing}
                    className={`block w-full py-3 text-center border rounded-lg font-semibold transition ${processing
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "border-gray-300 text-MidnightNavyText dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                  >
                    {t("pricing.choosePlan")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DynamicPricing;