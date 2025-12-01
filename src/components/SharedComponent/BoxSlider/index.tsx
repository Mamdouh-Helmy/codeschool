"use client";

import React, { useEffect, useRef, useState } from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

type Event = {
  _id?: string;
  title: string;
  date: string;
  time: string;
  isActive: boolean;
};

const BoxSlider = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sliderRef = useRef<any>(null);

  const { t } = useI18n();
  const { locale } = useLocale();
  const isArabic = String(locale || "").startsWith("ar");

  // جلب البيانات
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");

        const result = await res.json();
        setEvents(result.data || []);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
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
      hasEvent: boolean;
      event?: Event;
    }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;

      const event = events.find((ev) => ev.date === dateStr);

      days.push({
        date: dateStr,
        day: d,
        hasEvent: !!event,
        event,
      });
    }

    return days;
  };

  const monthDays = getCurrentMonthDays();

  // تحديد targetIndex
  const findTargetIndex = (days: any[]) => {
    const todayStr = new Date().toISOString().split("T")[0];

    const todayIndex = days.findIndex((d) => d.date === todayStr);
    if (todayIndex !== -1) return todayIndex;

    const futureEventIndex = days.findIndex((d) => {
      const eventDate = new Date(d.date);
      const today = new Date();

      eventDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      return d.hasEvent && eventDate >= today;
    });

    return futureEventIndex !== -1 ? futureEventIndex : 0;
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

    if (width <= 480) return 1;
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

  // clamp helper
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  // 🔥🔥 دالة offset الجديدة
  const getOffset = (slides: number) => {
    if (slides === 7) return 13;
    if (slides === 5) return 18;
    if (slides === 3) return 23;
    if (slides === 1) return 28;
    return slides;
  };

  // حساب startIndex مع offset
  const computeStartIndex = (dayIndex: number, total: number, slides: number) => {
    if (total <= slides) return 0;
    const centerSlot = Math.floor(slides / 2);
    const desiredStart = dayIndex - centerSlot;
    return clamp(desiredStart, 0, total - slides);
  };

  // ✨ هنا بقى السحر
  const startIndex = computeStartIndex(
    targetIndex,
    monthDays.length,
    slidesToShow + getOffset(slidesToShow)
  );

  // rotate array
  const orderedDays = React.useMemo(() => {
    const total = monthDays.length;
    if (total === 0) return monthDays;

    const s = clamp(Math.floor(startIndex), 0, total - 1);
    if (s === 0) return monthDays;

    return [...monthDays.slice(s), ...monthDays.slice(0, s)];
  }, [monthDays, startIndex]);

  useEffect(() => {
    if (sliderRef.current) {
      setTimeout(() => {
        if (sliderRef.current) sliderRef.current.slickGoTo(0, true);
      }, 80);
    }
  }, [orderedDays.length]);

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

  const getEventStatus = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();

    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) return "past";
    if (+eventDate === +today) return "today";
    return "soon";
  };

  const settings = {
    dots: false,
    arrows: false,
    infinite: true,
    slidesToShow: 7,
    slidesToScroll: 1,
    swipeToSlide: true,
    pauseOnHover: true,
    autoplay: false,
    centerMode: false,
    initialSlide: 0,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 5 } },
      { breakpoint: 768, settings: { slidesToShow: 3 } },
      { breakpoint: 480, settings: { slidesToShow: 1 } },
    ],
  };

  return (
    <div className="text-center space-y-4 overflow-hidden">
      {loading ? (
        <p className="text-gray-400">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-gray-400">{error}</p>
      ) : orderedDays.length > 0 ? (
        <Slider ref={sliderRef} {...settings}>
          {orderedDays.map((dayData, index) => {
            const { day, month, year } = formatDate(dayData.date);
            const status = getEventStatus(dayData.date);

            const isFutureWithoutEvent =
              status === "soon" && !dayData.hasEvent;

            let boxClasses = "";
            let dayClasses = "";
            let dateClasses = "";

            if (status === "past" || isFutureWithoutEvent) {
              boxClasses =
                "bg-gray-300 dark:bg-gray-700 opacity-90 cursor-default";
              dayClasses = "text-gray-500";
              dateClasses = "text-gray-500";
            } else if (status === "today") {
              boxClasses =
                "bg-IcyBreeze dark:bg-darklight border-2 border-primary shadow-lg";
              dayClasses = "text-primary";
              dateClasses = "text-primary";
            } else {
              boxClasses =
                "bg-IcyBreeze dark:bg-darklight hover:bg-primary transition-all duration-300";
              dayClasses = "text-gray-400 group-hover:text-white";
              dateClasses = "text-gray-400 group-hover:text-white";
            }

            const labelForDay =
              status === "today"
                ? t("upcoming.today") || (isArabic ? "اليوم" : "Today")
                : day;

            const smallBadge =
              status === "soon" && dayData.hasEvent
                ? t("upcoming.comingSoon") || (isArabic ? "قريباً" : "Soon")
                : null;

            return (
              <div key={`${dayData.date}-${index}`} className="px-2">
                <div
                  className={`pt-5 pb-7 rounded-lg text-center group relative ${boxClasses}`}
                >
                  {smallBadge && (
                    <div className="absolute -top-0 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-semibold">
                      {smallBadge}
                    </div>
                  )}

                  <h5
                    className={`text-[34px] leading-[2.76rem] font-normal ${dayClasses}`}
                  >
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
      ) : (
        <p className="text-gray-400">{t("upcoming.noEvents")}</p>
      )}
    </div>
  );
};

export default BoxSlider;
