"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
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

interface SectionImage {
  _id: string;
  sectionName: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
  language: string;
  isActive: boolean;
}

const TicketSection = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [sectionImage, setSectionImage] = useState<SectionImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const { t } = useI18n();
  const { locale } = useLocale();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/pricing", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch pricing plans");

        const result = await res.json();
        setPlans(result.data || []);
      } catch (err) {
        console.error("Error fetching pricing plans:", err);
        setError(t("ticketSection.loadError"));
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [t]);

  // جلب صورة القسم من الباك إند
  useEffect(() => {
    const fetchSectionImage = async () => {
      try {
        setImageLoading(true);
        const res = await fetch(`/api/section-images/ticket-section`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            setSectionImage(result.data);
          }
        }
      } catch (err) {
        console.error("Error fetching section image:", err);
        // استخدام الصورة الافتراضية في حالة الخطأ
        setSectionImage(null);
      } finally {
        setImageLoading(false);
      }
    };

    fetchSectionImage();
  }, [locale]);

  // ✅ بدل الاشتراك المباشر → نحول المستخدم لصفحة التسعير
  const handleChoosePlan = (planId: string) => {
    router.push(`/subscriptions?plan=${encodeURIComponent(planId)}`);
  };

  return (
    <section className="dark:bg-darkmode pt-0">
      <Toaster position="top-center" />
      <div className="container">
        <div className="bg-primary relative md:mx-auto mx-0 overflow-hidden py-0 rounded-22 lg:-mb-48 dark:lg:-mb-48 md:mt-16 mt-8">
          <div className="flex flex-wrap items-center gap-12 justify-between md:p-10 p-5">
            {/* الخلفية الزرقاء */}
            <div className="md:w-[48%] w-full h-full absolute top-0 -left-1 md:block hidden">
              {imageLoading ? (
                <div className="w-full h-64 flex items-center justify-center bg-primary">
                  <div className="text-white">Loading image...</div>
                </div>
              ) : (
                <img
                  src={sectionImage?.imageUrl || "/images/ticket-section/ticket.png"}
                  alt={sectionImage?.imageAlt || t("ticketSection.ticketAlt")}
                  width={100}
                  height={100}

                  className="object-cover w-full h-full"
                />
              )}
            </div>

            {/* النص + الخطط */}
            <div className="md:w-[50%] w-full ml-auto lg:text-start text-center relative z-10">
              <p className="sm:text-3xl text-[22px] leading-[2rem] font-bold text-white lg:max-w-364 max-w-full pb-6">
                {t("ticketSection.title")}
              </p>

              {loading ? (
                <p className="text-white/70 pb-4 text-sm">{t("common.loading")}</p>
              ) : error ? (
                <p className="text-white/70 pb-4 text-sm">{error}</p>
              ) : plans.length > 0 ? (
                <div className="space-y-3 pb-6">
                  {plans.slice(0, 2).map((plan) => (
                    <div
                      key={plan._id || plan.id || plan.name}
                      className="bg-white/10 backdrop-blur-sm p-3 rounded-lg text-white"
                    >
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className="text-white/80 text-xs">
                        {plan.description}
                      </p>
                      <p className="mt-1 font-bold text-sm">
                        {plan.price} {plan.currency} / {plan.billingPeriod}
                      </p>

                      {/* زرار الاشتراك */}
                      <button
                        onClick={() => handleChoosePlan(plan._id!)}
                        className="btn btn-1 hover-filled-slide-down rounded-md overflow-hidden before:bg-ElectricAqua mt-2 scale-95 hover:scale-100 transition-transform"
                      >
                        <span className="px-6 py-1 !border-ElectricAqua !text-white text-xs font-medium">
                          {t("ticketSection.choosePlan")}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/70 pb-4 text-sm">
                  {t("ticketSection.noPlans")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TicketSection;