"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

interface Plan {
  _id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: string;
}

interface Subscription {
  status: string;
  plan?: Plan | string;
}

interface SectionImage {
  _id: string;
  sectionName: string;
  imageUrl: string;
  imageAlt: string;
  description: string;
  language: string;
  isActive: boolean;
}

const EventTicket: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscribedPlans, setSubscribedPlans] = useState<string[]>([]);
  const [sectionImage, setSectionImage] = useState<SectionImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { locale } = useLocale();

  const auth = useAuth();
  const { t } = useI18n();

  // جلب الباقات من الـ API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/pricing", { cache: "no-store" });
        const result = await res.json();

        if (result.success && result.data?.length > 0) {
          setPlans(result.data);
        } else {
          setPlans([]);
        }
      } catch (err) {
        console.error("Fetch pricing error:", err);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // جلب صورة القسم من الباك إند
  useEffect(() => {
    const fetchSectionImage = async () => {
      try {
        setImageLoading(true);

        // استخدم المسار الديناميكي بدون language
        const res = await fetch(`/api/section-images/event-ticket`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            setSectionImage(result.data);
          }
        }
      } catch (err) {
        console.error("Error fetching section image:", err);
        setSectionImage(null);
      } finally {
        setImageLoading(false);
      }
    };

    fetchSectionImage();
  }, []);

  // جلب اشتراكات المستخدم الحالية
  useEffect(() => {
    const fetchUserSubscriptions = async () => {
      try {
        const res = await fetch("/api/subscriptions", { cache: "no-store" });
        if (!res.ok) return;
        const result = await res.json();
        if (result.success && result.data?.length > 0) {
          const userSubs = (result.data as Subscription[])
            .filter((sub) => sub.status !== "cancelled")
            .map((sub) => (typeof sub.plan === "object" ? sub.plan._id : sub.plan));
          setSubscribedPlans(userSubs as string[]);
        }
      } catch (error) {
        console.error("Error fetching user subscriptions:", error);
      }
    };

    fetchUserSubscriptions();
  }, []);

  // الاشتراك في الخطة
  const handleSubscribe = async (planId: string) => {
    if (subscribedPlans.includes(planId)) {
      toast.error(t("eventTicket.alreadySubscribed"));
      return;
    }

    if (!auth?.isAuthenticated) {
      toast.error(t("eventTicket.pleaseLogin"));
      const callback = window.location.pathname || "/";
      window.location.href = `/signin?callbackUrl=${encodeURIComponent(callback)}&plan=${planId}`;
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          paymentMethod: "manual",
          studentCount: 1,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success(t("eventTicket.subscriptionSuccess"));
        setSubscribedPlans((prev) => [...prev, planId]);
      } else if (res.status === 401) {
        toast.error(t("eventTicket.pleaseLogin"));
        const callback = window.location.pathname || "/";
        window.location.href = `/signin?callbackUrl=${encodeURIComponent(callback)}&plan=${planId}`;
      } else {
        toast.error(result.message || t("eventTicket.subscriptionFailed"));
      }
    } catch (err) {
      toast.error(t("eventTicket.subscriptionError"));
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const isArabic = locale === "ar";

  const imageContainerClass = isArabic
    ? "bg-primary flex items-center justify-center lg:px-16 px-8 lg:py-0 py-8 lg:rounded-r-22 rounded-t-22 md:rounded-tl-none md:rounded-br-22 rounded-br-none md:w-2/4 w-full"
    : "bg-primary flex items-center justify-center lg:px-16 px-8 lg:py-0 py-8 lg:rounded-l-22 rounded-t-22 md:rounded-tr-none md:rounded-bl-22 rounded-bl-none md:w-2/4 w-full";

  const plansContainerClass = isArabic
    ? "bg-IcyBreeze dark:bg-darklight lg:py-14 py-6 lg:px-10 px-4 lg:rounded-l-22 rounded-b-22 md:rounded-br-none md:rounded-tl-22 rounded-tl-none md:w-2/4 w-full"
    : "bg-IcyBreeze dark:bg-darklight lg:py-14 py-6 lg:px-10 px-4 lg:rounded-r-22 rounded-b-22 md:rounded-bl-none md:rounded-tr-22 rounded-tr-none md:w-2/4 w-full";

  return (
    <>
      <section className="dark:bg-darkmode pt-0">
        <Toaster position="top-center" />
        <div className="container">
          <div className="text-center md:pb-20 pb-8">
            <h2
              className="pb-8"
              data-aos="fade-up"
              data-aos-delay="200"
              data-aos-duration="1000"
            >
              {t("eventTicket.title")}
            </h2>
            <p
              data-aos="fade-up"
              data-aos-delay="300"
              data-aos-duration="1000"
              className="text-SlateBlueText dark:text-opacity-80 text-lg font-normal max-w-920 m-auto"
            >
              {t("eventTicket.description")}
            </p>
          </div>

          <div
            className="flex flex-wrap items-stretch"
            data-aos="fade-up"
            data-aos-delay="400"
            data-aos-duration="1000"
          >
            <div className={imageContainerClass}>
              {imageLoading ? (
                <div className="w-full h-64 flex items-center justify-center">
                  <div className="text-white">Loading image...</div>
                </div>
              ) : (
                <Image
                  src={sectionImage?.imageUrl || "/images/event-ticket/ticket.png"}
                  alt={sectionImage?.imageAlt || t("eventTicket.ticketAlt")}
                  width={0}
                  height={0}
                  quality={100}
                  layout="responsive"
                  sizes="100vh"
                  className="object-cover"
                />
              )}
            </div>

            <div className={plansContainerClass}>
              <div className="bg-white dark:bg-darklight rounded-22 lg:px-11 px-4 pt-8 pb-10">
                <h6 className="text-[26px] leading-[2.1rem] font-bold text-secondary dark:text-white pb-5">
                  {t("eventTicket.subscriptionPlans")}
                </h6>

                <div className="overflow-x-auto mt-4 scrollbar-hide">
                  {loading ? (
                    <div className="text-center py-4">{t("common.loading")}</div>
                  ) : plans.length === 0 ? (
                    <div className="text-center py-6 text-SlateBlueText">
                      {t("eventTicket.noPlansAvailable") || "No plans available"}
                    </div>
                  ) : (
                    <table
                      className="min-w-full w-full text-left border-collapse"
                      dir={isArabic ? "rtl" : "ltr"}
                    >
                      <tbody>
                        {plans.map((plan) => {
                          const isSubscribed = subscribedPlans.includes(plan._id);
                          return (
                            <tr
                              key={plan._id}
                              className="border-b dark:border-darktext/30 hover:bg-gray-50 dark:hover:bg-darklight/40 transition"
                            >
                              <td className="py-4 px-4 font-bold text-secondary dark:text-white">
                                {plan.price} {plan.currency}
                              </td>

                              <td className="py-4 px-4 text-secondary dark:text-darktext">
                                {plan.name}
                              </td>

                              <td className="py-4 px-4 text-SlateBlueText">
                                {plan.billingPeriod}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  <div className="mt-6">
                    <Link
                      href="/subscriptions"
                      className="btn btn-1 hover-filled-slide-down w-full text-center rounded-lg overflow-hidden"
                    >
                      <span>{t("eventTicket.viewAllSubscriptions")}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default EventTicket;