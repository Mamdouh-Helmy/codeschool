"use client";

import React, { useEffect, useRef, useState } from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

type Webinar = {
  _id?: string;
  title: string;
  date: string;
  time: string;
  isActive: boolean;
};

const BoxSlider = () => {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sliderRef = useRef<any>(null);

  const { t } = useI18n();
  const { locale } = useLocale();
  const isArabic = String(locale || "").startsWith("ar");

  // جلب البيانات
  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        const res = await fetch("/api/webinars", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");

        const result = await res.json();
        setWebinars(result.data || []);
      } catch (err) {
        console.error("Error fetching webinars:", err);
        setError(t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, [t]);

  // تجهيز أيام الشهر
  const getCurrentMonthDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days: {
      date: string;
      day: number;
      hasWebinar: boolean;
      webinar?: Webinar;
    }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;

      const webinar = webinars.find((wb) => wb.date === dateStr);

      days.push({
        date: dateStr,
        day: d,
        hasWebinar: !!webinar,
        webinar,
      });
    }

    return days;
  };

  const monthDays = getCurrentMonthDays();

  // تحديد targetIndex (اليوم الحالي أو أقرب webinar مستقبلي)
  const findTargetIndex = (days: any[]) => {
    const todayStr = new Date().toISOString().split("T")[0];

    const todayIndex = days.findIndex((d) => d.date === todayStr);
    if (todayIndex !== -1) return todayIndex;

    const futureWebinarIndex = days.findIndex((d) => {
      const webinarDate = new Date(d.date);
      const today = new Date();

      webinarDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      return d.hasWebinar && webinarDate >= today;
    });

    return futureWebinarIndex !== -1 ? futureWebinarIndex : 0;
  };

  const targetIndex = findTargetIndex(monthDays);

  // responsive slides count
  const getSlidesToShow = (w?: number) => {
    const width =
      typeof w === "number"
        ? w
        : typeof window !== "undefined"
        ? window.innerWidth
        : 1200;

    if (width <= 480) return 2;
    if (width <= 768) return 3;
    if (width <= 1024) return 5;
    return 7;
  };

  const [slidesToShow, setSlidesToShow] = useState(() => getSlidesToShow());
  useEffect(() => {
    const onResize = () => setSlidesToShow(getSlidesToShow());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // format helpers
  const toArabicNumbers = (input: string | number) => {
    const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return String(input).replace(/\d/g, (d) => map[Number(d)]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const localeCode = isArabic ? "ar" : "en";

    let day = date.toLocaleString(localeCode, { day: "numeric" });
    let month = date.toLocaleString(localeCode, { month: "short" });
    let year = date.toLocaleString(localeCode, { year: "numeric" });

    if (!isArabic) month = month.toUpperCase();

    if (isArabic) {
      day = toArabicNumbers(day);
      year = toArabicNumbers(year);
      month = month.replace(/\d/g, (n) => toArabicNumbers(n));
    }

    return { day, month, year };
  };

  const getWebinarStatus = (dateStr: string, hasWebinar: boolean) => {
    const webinarDate = new Date(dateStr);
    const today = new Date();

    webinarDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // إذا كان اليوم هو اليوم الحالي
    if (+webinarDate === +today) {
      // إذا كان اليوم الحالي وليس فيه webinar
      if (!hasWebinar) {
        return "today-no-webinar";
      }
      return "today";
    }
    
    if (webinarDate < today) return "past";
    
    // إذا كان يوم مستقبلي وليس فيه webinar
    if (!hasWebinar) return "future-no-webinar";
    return "soon";
  };

  // 🔥 وظائف التنقل للسلايدر
  const goToNext = () => {
    if (sliderRef.current) {
      sliderRef.current.slickNext();
    }
  };

  const goToPrev = () => {
    if (sliderRef.current) {
      sliderRef.current.slickPrev();
    }
  };

  const settings = {
    dots: false,
    arrows: false,
    infinite: false,
    slidesToShow: slidesToShow,
    slidesToScroll: slidesToShow,
    swipeToSlide: true,
    pauseOnHover: true,
    autoplay: false,
    centerMode: false,
    initialSlide: targetIndex,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 5 } },
      { breakpoint: 768, settings: { slidesToShow: 3 } },
      { breakpoint: 480, settings: { slidesToShow: 2 } },
    ],
  };

  // 🔥 نختار العرض بناءً على slidesToShow
  const renderContent = () => {
    return (
      <div className="relative">
        {/* 🔥 أزرار التنقل */}
        <button
          onClick={goToPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isArabic ? "السابق" : "Previous"}
          disabled={targetIndex === 0}
        >
          <svg 
            className={`w-5 h-5 md:w-6 md:h-6 ${isArabic ? "rotate-180" : ""}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={goToNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 z-10 bg-white dark:bg-gray-800 shadow-lg rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isArabic ? "التالي" : "Next"}
          disabled={targetIndex + slidesToShow >= monthDays.length}
        >
          <svg 
            className={`w-5 h-5 md:w-6 md:h-6 ${isArabic ? "rotate-180" : ""}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <Slider ref={sliderRef} {...settings}>
          {monthDays.map((dayData, index) => {
            const { day, month, year } = formatDate(dayData.date);
            const status = getWebinarStatus(dayData.date, dayData.hasWebinar);
            
            // 🔥 تحديد الكلاسات بناءً على الحالة
            let boxClasses = "";
            let dayClasses = "";
            let dateClasses = "";
            
            if (status === "past") {
              boxClasses = "bg-gray-300 dark:bg-gray-700 opacity-90 cursor-default";
              dayClasses = "text-gray-500";
              dateClasses = "text-gray-500";
            } else if (status === "today-no-webinar") {
              // 🔥 إذا كان اليوم الحالي وليس فيه webinar
              boxClasses = "bg-gray-300 dark:bg-gray-700 opacity-90 cursor-default";
              dayClasses = "text-gray-500";
              dateClasses = "text-gray-500";
            } else if (status === "today") {
              boxClasses = "bg-IcyBreeze dark:bg-darklight border-2 border-primary shadow-lg";
              dayClasses = "text-primary";
              dateClasses = "text-primary";
            } else if (status === "future-no-webinar") {
              // 🔥 إذا كان يوم مستقبلي وليس فيه webinar
              boxClasses = "bg-gray-300 dark:bg-gray-700 opacity-90 cursor-default";
              dayClasses = "text-gray-500";
              dateClasses = "text-gray-500";
            } else {
              // 🔥 إذا كان يوم مستقبلي وفيه webinar
              boxClasses = "bg-IcyBreeze dark:bg-darklight hover:bg-primary transition-all duration-300";
              dayClasses = "text-gray-400 group-hover:text-white";
              dateClasses = "text-gray-400 group-hover:text-white";
            }
            
            // 🔥 تحديد النص المعروض لليوم
            const labelForDay = status === "today" || status === "today-no-webinar"
              ? t("upcoming.today") || (isArabic ? "اليوم" : "Today")
              : day;
            
            // 🔥 تحديد البادج
            const smallBadge = status === "soon" && dayData.hasWebinar
              ? t("upcoming.comingSoon") || (isArabic ? "قريباً" : "Soon")
              : null;
            
            // تحقق إذا كان هذا اليوم هو اليوم الحالي
            const isTargetDay = index === targetIndex;
            
            return (
              <div key={`${dayData.date}-${index}`} className="px-2">
                <div
                  className={`pt-5 pb-7 rounded-lg text-center group relative ${boxClasses} ${
                    isTargetDay && status !== "today-no-webinar" ? "ring-2 ring-primary ring-opacity-50" : ""
                  }`}
                >
                  {smallBadge && (
                    <div className="absolute -top-0 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-semibold">
                      {smallBadge}
                    </div>
                  )}
                  
                  <h5 className={`text-[34px] leading-[2.76rem] font-normal ${dayClasses}`}>
                    {labelForDay}
                  </h5>
                  
                  <p className={`text-xs font-medium ${dateClasses}`}>
                    {month} {year}
                  </p>
                </div>
              </div>
            );
          })}
        </Slider>
      </div>
    );
  };

  return (
    <div className="text-center space-y-4 overflow-hidden">
      {loading ? (
        <p className="text-gray-400">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-gray-400">{error}</p>
      ) : monthDays.length > 0 ? (
        renderContent()
      ) : (
        <p className="text-gray-400">{t("upcoming.noEvents")}</p>
      )}
    </div>
  );
};

export default BoxSlider;