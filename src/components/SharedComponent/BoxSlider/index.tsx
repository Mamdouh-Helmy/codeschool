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
      {
        breakpoint: 1024,
        settings: { slidesToShow: 5, slidesToScroll: 1 },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 3, slidesToScroll: 1 },
      },
      {
        breakpoint: 480,
        settings: { slidesToShow: 2, slidesToScroll: 1 },
      },
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

    if (!isArabic) {
      month = month.toUpperCase();
    }

    if (isArabic) {
      day = toArabicNumbers(day);
      year = toArabicNumbers(year);

      month = month.replace(/\d/g, (d) => toArabicNumbers(d));
    }

    return { day, month, year };
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
            return (
              <div key={event._id || index} className="px-2">
                <div className="bg-IcyBreeze dark:bg-darklight pt-5 pb-7 rounded-lg text-center group hover:bg-primary transition-all duration-300">
                  <h5 className="text-gray-400 text-[34px] leading-[2.76rem] font-normal group-hover:text-white">
                    {day}
                  </h5>
                  <p className="text-xs font-medium text-gray-400 group-hover:text-white">
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
