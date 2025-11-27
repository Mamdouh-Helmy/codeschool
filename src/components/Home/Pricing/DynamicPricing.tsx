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
  originalPrice: number;
  discount: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  isPopular?: boolean;
};

const DynamicPricing = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribedPlans, setSubscribedPlans] = useState<string[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedPlanData, setSelectedPlanData] = useState<PricingPlan | null>(null);

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
        if (result.success && result.data?.length > 0) setPlans(result.data);
        else setError(t("pricing.noPlans"));
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

    // if (!auth?.isAuthenticated) {
    //   try {
    //     const sess = await fetch("/api/auth/session", { cache: "no-store" });
    //     if (sess.ok) {
    //       const sessJson = await sess.json();
    //       if (!(sessJson?.success && sessJson?.loggedIn)) {
    //         toast.error(t("eventTicket.pleaseLogin"));
          
    //         return;
    //       }
    //     } else {
    //       toast.error(t("eventTicket.pleaseLogin"));
         
    //       return;
    //     }
    //   } catch (e) {
    //     console.error("Session check failed:", e);
    //     toast.error(t("eventTicket.pleaseLogin"));
       
    //     return;
    //   }
    // }

    const selectedPlanInfo = plans.find(p => p._id === planId || p.id === planId);
    if (!selectedPlanInfo) {
      toast.error(t("pricing.planNotFound") || "الخطة غير موجودة");
      return;
    }

    setSelectedPlanData(selectedPlanInfo);
    setShowWhatsAppModal(true);
  };

  const openWhatsApp = () => {
    if (!selectedPlanData) return;

    try {
      setProcessing(true);
      const message = `مرحباً، أريد الاشتراك في الخطة التالية:%0A%0A*الخطة المختارة:* ${selectedPlanData.name}%0A*السعر الأصلي:* ${selectedPlanData.originalPrice} ${selectedPlanData.currency}%0A*الخصم:* ${selectedPlanData.discount}%25%0A*السعر بعد الخصم:* ${selectedPlanData.price} ${selectedPlanData.currency}%0A*مدة الاشتراك:* ${selectedPlanData.billingPeriod === 'monthly' ? 'شهري' : selectedPlanData.billingPeriod === 'yearly' ? 'سنوي' : selectedPlanData.billingPeriod}%0A*وصف الخطة:* ${selectedPlanData.description}%0A%0Aيرجى التواصل معي لإكمال عملية الاشتراك والدفع.`;
      const whatsappNumber = "+201110050892";
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
      window.location.href = whatsappUrl;
      toast.success(t("pricing.redirectingToWhatsApp") || "جاري التوجيه إلى الواتساب...");
    } catch (err) {
      toast.error(t("pricing.redirectError") || "حدث خطأ أثناء التوجيه للواتساب");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setShowWhatsAppModal(false);
    setSelectedPlanData(null);
  };

  const cleanFeatureText = (feature: string) => feature.replace(/^"|",$|"$/g, '').trim();

  if (loading) return <div className="py-20 text-center text-gray-500">{t("pricing.loading")}</div>;
  if (error) return <div className="py-20 text-center text-red-500">{error}</div>;

  return (
    <section className="bg-white dark:bg-darklight py-20 mt-6">
      <Toaster position="top-center" />
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id || selectedPlan === plan._id;
            const isSubscribed = subscribedPlans.includes(plan._id || plan.id!);
            const hasDiscount = plan.discount > 0;

            return (
              <div
                key={plan._id || plan.id}
                className={`relative bg-white dark:bg-darkmode rounded-2xl shadow-lg p-8 transition-all flex flex-col justify-between ${isSelected ? "ring-4 ring-primary scale-105" : "hover:shadow-xl"
                  } ${plan.isPopular ? "border-2 border-primary" : ""}`}
              >
                <div>
                  {plan.isPopular && (
                    <div className="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {t("pricing.popular") || "الأكثر شيوعاً"}
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {t("common.selected")}
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {plan.discount}% {t("pricing.discount") || "خصم"}
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-center my-6">{plan.name}</h3>
                  <p className="text-center text-gray-600 dark:text-gray-300 mb-4">{plan.description}</p>

                  <div className="text-center mb-6">
                    {hasDiscount && (
                      <div className="flex justify-center items-center gap-2 mb-2">
                        <span className="text-lg text-gray-500 line-through">{plan.originalPrice} {plan.currency}</span>
                        <span className="text-primary px-2 py-1 rounded text-sm font-semibold">{plan.discount}% {t("pricing.off") || "خصم"}</span>
                      </div>
                    )}
                    {locale === "ar" ? (
                      <p className="text-4xl font-bold text-primary">
                        <span className="text-gray-500 text-base ml-1">{plan.billingPeriod} /</span> {plan.price} {plan.currency}
                      </p>
                    ) : (
                      <p className="text-4xl font-bold text-primary">
                        {plan.price} {plan.currency} <span className="text-gray-500 text-base ml-1">/ {plan.billingPeriod}</span>
                      </p>
                    )}
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t("pricing.features") || "المميزات:"}</h4>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{cleanFeatureText(feature)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  {isSubscribed ? (
                    <button disabled className="w-full flex items-center justify-center gap-2 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed">
                      <CheckCircle className="w-5 h-5 text-white" />
                      <span>{t("eventTicket.subscribed")}</span>
                    </button>
                  ) : isSelected ? (
                    <button onClick={() => handleSubscribe(plan._id!)} disabled={processing} className={`w-full py-3 rounded-lg font-semibold transition ${processing ? "bg-gray-400 cursor-not-allowed" : "bg-primary text-white hover:bg-primary/90"}`}>
                      {processing ? t("eventTicket.processing") : t("pricing.subscribe")}
                    </button>
                  ) : (
                    <button onClick={() => setSelectedPlan(plan._id!)} disabled={processing} className={`block w-full py-3 text-center border rounded-lg font-semibold transition ${processing ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "border-gray-300 text-MidnightNavyText dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                      {t("pricing.choosePlan")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && selectedPlanData && (
        <div onClick={closeModal} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-darkmode p-8 rounded-2xl shadow-2xl w-[90vw] md:w-[500px] mx-4 relative animate-fadeIn">
            <button onClick={closeModal} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold">×</button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("pricing.confirmSubscription")}</h3>
              <p className="text-gray-600 dark:text-gray-400">{t("pricing.whatsappMessage")}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
              <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-3">{t("pricing.planDetails")}</h4>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p className="flex justify-between"><span className="font-semibold">{t("pricing.planName")}</span><span>{selectedPlanData.name}</span></p>
                {selectedPlanData.discount > 0 && (
                  <>
                    <p className="flex justify-between"><span className="font-semibold">{t("pricing.originalPrice") || "السعر الأصلي"}</span><span className="line-through text-red-500">{selectedPlanData.originalPrice} {selectedPlanData.currency}</span></p>
                    <p className="flex justify-between"><span className="font-semibold">{t("pricing.discount") || "الخصم"}</span><span className="text-primary">{selectedPlanData.discount}%</span></p>
                  </>
                )}
                <p className="flex justify-between"><span className="font-semibold">{t("pricing.planPrice")}</span><span className="text-primary font-bold">{selectedPlanData.price} {selectedPlanData.currency}</span></p>
                <p className="flex justify-between"><span className="font-semibold">{t("pricing.planDuration")}</span><span>{selectedPlanData.billingPeriod === 'monthly' ? t("pricing.monthly") : selectedPlanData.billingPeriod === 'yearly' ? t("pricing.yearly") : selectedPlanData.billingPeriod}</span></p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition">{t("common.cancel")}</button>
              <button onClick={openWhatsApp} disabled={processing} className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${processing ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"}`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                {processing ? t("pricing.openWhatsAppLoding") : t("pricing.openWhatsApp")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DynamicPricing;
