"use client";

import React, { useEffect, useState } from "react";
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
  const { t } = useI18n();
  const { locale } = useLocale();
  const isArabic = String(locale || "").startsWith("ar");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch events");

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

  const settings = {
    dots: false,
    arrows: false,
    infinite: true,
    speed: 6000,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    slidesToShow: 7,
    slidesToScroll: 1,
    pauseOnHover: true,
    swipeToSlide: true,

    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 5, slidesToScroll: 1 } },
      { breakpoint: 768, settings: { slidesToShow: 3, slidesToScroll: 1 } },
      { breakpoint: 480, settings: { slidesToShow: 2, slidesToScroll: 1 } },
    ],
  };

  const toArabicNumbers = (input: string | number) => {
    const map = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
    return String(input).replace(/\d/g, d => map[Number(d)]);
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
      month = month.replace(/\d/g, d => toArabicNumbers(d));
    }

    return { day, month, year };
  };

  const getEventStatus = (eventDateStr: string) => {
    const eventDate = new Date(eventDateStr);
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfEvent = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    const msDiff = startOfEvent.getTime() - startOfToday.getTime();
    const daysDiff = Math.round(msDiff / (1000 * 3600 * 24));

    if (daysDiff === 0) return { status: "today" as const };
    if (daysDiff >= 1 && daysDiff <= 12) return { status: "soon" as const };
    return { status: null as null };
  };

  return (
    <div className="text-center space-y-4 overflow-hidden">
      {loading ? (
        <p className="text-gray-400">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-gray-400">{error}</p>
      ) : events.length > 0 ? (
        <Slider {...settings}>
          {[...events, ...events].map((event, index) => {
            const { day, month, year } = formatDate(event.date);
            const { status } = getEventStatus(event.date);

            const isHighlighted = status === "today" || status === "soon";

            // label للـ h5
            const labelForDay = status === "today" ? t("upcoming.today") || (isArabic ? "اليوم" : "Today") : day;

            // badge صغيرة
            const smallBadge = status === "soon" ? t("upcoming.comingSoon") || (isArabic ? "قريباً" : "Soon") : null;

            return (
              <div key={event._id || `${index}-${event.date}`} className="px-2">
                <div
                  className={`bg-IcyBreeze dark:bg-darklight pt-5 pb-7 rounded-lg text-center group transition-all duration-300 relative ${isHighlighted ? "border-2 border-primary shadow-lg" : "hover:bg-primary"}`}
                >
                  {smallBadge && (
                    <div className="absolute -top-0 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-semibold">
                      {smallBadge}
                    </div>
                  )}

                  <h5 className={`text-[34px] leading-[2.76rem] font-normal ${isHighlighted ? "text-primary group-hover:text-primary-dark" : "text-gray-400 group-hover:text-white"}`}>
                    {labelForDay}
                  </h5>

                  <p className={`text-xs font-medium ${isHighlighted ? "text-primary group-hover:text-primary-dark" : "text-gray-400 group-hover:text-white"}`}>
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
