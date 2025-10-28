"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

const EventTicket = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [subscribedPlans, setSubscribedPlans] = useState([]);
  const { locale } = useLocale();

  const auth = useAuth();
  const { t } = useI18n();

  // ✅ جلب الباقات من الـ API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/pricing", { cache: "no-store" });
        const result = await res.json();

        if (result.success && result.data?.length > 0) {
          setPlans(result.data);
        }
      } catch (err) {
        console.error("Fetch pricing error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // ✅ جلب اشتراكات المستخدم
  useEffect(() => {
    const fetchUserSubscriptions = async () => {
      try {
        const res = await fetch("/api/subscriptions", { cache: "no-store" });
        if (!res.ok) return;
        const result = await res.json();
        if (result.success && result.data?.length > 0) {
          const userSubs = result.data
            .filter((sub) => sub.status !== "cancelled")
            .map((sub) => sub.plan?._id || sub.plan);
          setSubscribedPlans(userSubs);
        }
      } catch (error) {
        console.error("Error fetching user subscriptions:", error);
      }
    };

    fetchUserSubscriptions();
  }, []);

  // ✅ الاشتراك في الخطة
  const handleSubscribe = async (planId) => {
    if (subscribedPlans.includes(planId)) {
      toast.error(t("eventTicket.alreadySubscribed"));
      return;
    }

    if (!auth?.isAuthenticated) {
      toast.error(t("eventTicket.pleaseLogin"));
      const callback = window.location.pathname || "/";
      window.location.href = `/signin?callbackUrl=${encodeURIComponent(
        callback
      )}&plan=${planId}`;
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
        window.location.href = `/signin?callbackUrl=${encodeURIComponent(
          callback
        )}&plan=${planId}`;
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
    ? "bg-ElectricAqua lg:py-14 py-6 lg:px-10 px-4 lg:rounded-l-22 rounded-b-22 md:rounded-br-none md:rounded-tl-22 rounded-tl-none md:w-2/4 w-full"
    : "bg-ElectricAqua lg:py-14 py-6 lg:px-10 px-4 lg:rounded-r-22 rounded-b-22 md:rounded-bl-none md:rounded-tr-22 rounded-tr-none md:w-2/4 w-full";

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
              <Image
                src="/images/event-ticket/ticket.png"
                alt={t("eventTicket.ticketAlt")}
                width={0}
                height={0}
                quality={100}
                layout="responsive"
                sizes="100vh"
              />
            </div>
            <div className={plansContainerClass}>
              <div className="bg-white dark:bg-darklight rounded-22 lg:px-11 px-4 pt-8 pb-10">
                <h6 className="text-[26px] leading-[2.1rem] font-bold text-secondary dark:text-white pb-5">
                  {t("eventTicket.subscriptionPlans")}
                </h6>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-4">
                      {t("common.loading")}
                    </div>
                  ) : (
                    plans.map((plan) => {
                      const isSubscribed = subscribedPlans.includes(plan._id);

                      return (
                        <div
                          key={plan._id}
                          className="flex items-center md:gap-10 gap-2"
                        >
                          <span className="text-[17px] leading-[2rem] font-bold text-secondary dark:text-white">
                            {plan.price} {plan.currency}
                          </span>
                          <p className="text-xl font-normal text-secondary dark:text-darktext">
                            {plan.name}
                          </p>
                          <p className="text-sm font-normal text-SlateBlueText">
                            {plan.billingPeriod}
                          </p>
                          {/* {isSubscribed ? (
                            <button
                              disabled
                              className="ml-auto px-4 py-1 bg-primary text-white rounded text-sm font-semibold cursor-not-allowed"
                            >
                              {t("eventTicket.subscribed")}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSubscribe(plan._id)}
                              disabled={processing}
                              className={`ml-auto px-4 py-1 rounded text-sm font-semibold transition ${
                                processing
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : "bg-primary text-white hover:bg-primary/90"
                              }`}
                            >
                              {processing ? t("eventTicket.processing") : t("eventTicket.subscribe")}
                            </button>
                          )} */}
                        </div>
                      );
                    })
                  )}
                  <Link
                    href="/subscriptions"
                    className="btn btn-1 hover-filled-slide-down w-full text-center rounded-lg overflow-hidden mt-6"
                  >
                    <span>{t("eventTicket.viewAllSubscriptions")}</span>
                  </Link>
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
