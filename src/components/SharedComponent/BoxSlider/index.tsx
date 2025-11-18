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
      month = month.replace(/\d/g, (d) => toArabicNumbers(d));
    }

    return { day, month, year };
  };

  const getEventStatus = (eventDateStr: string) => {
    const [year, month, day] = eventDateStr.split("-").map(Number);
    const eventDate = new Date(year, month - 1, day);
    eventDate.setHours(0, 0, 0, 0); // تجاهل الوقت

    const now = new Date();
    now.setHours(0, 0, 0, 0); // تجاهل الوقت

    let status: "past" | "today" | "soon";

    if (eventDate.getTime() < now.getTime()) {
      status = "past";
    } else if (eventDate.getTime() === now.getTime()) {
      status = "today";
    } else {
      status = "soon";
    }

    console.log(
      "EVENT DATE:", eventDate.toDateString(),
      "TODAY:", now.toDateString(),
      "STATUS:", status
    );

    return { status };
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

            let boxClasses = "";
            let dayClasses = "";
            let dateClasses = "";

            if (status === "past") {
              boxClasses = "bg-gray-300 dark:bg-gray-700 opacity-90 cursor-default";
              dayClasses = "text-gray-500";
              dateClasses = "text-gray-500";
            } else if (status === "today") {
              boxClasses = "bg-IcyBreeze dark:bg-darklight border-2 border-primary shadow-lg";
              dayClasses = "text-primary";
              dateClasses = "text-primary";
            } else if (status === "soon") {
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
              status === "soon"
                ? t("upcoming.comingSoon") || (isArabic ? "قريباً" : "Soon")
                : null;

            return (
              <div key={event._id || `${index}-${event.date}`} className="px-2">
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
