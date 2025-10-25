"use client";

import React, { useEffect, useState } from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";

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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch events");

        const result = await res.json();
        setEvents(result.data || []);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const settings = {
    dots: false,
    arrows: false, // 🔹 نخفي الأسهم عشان الشكل يكون شريط متصل
    infinite: true, // 🔁 مهم جدًا للاستمرارية
    speed: 6000, // ⏩ سرعة الانزلاق (غيّر الرقم لو عايز أسرع أو أبطأ)
    autoplay: true, // 🌀 تشغيل تلقائي
    autoplaySpeed: 0, // ⏱️ صفر = حركة مستمرة بدون توقف
    cssEase: "linear", // 💨 يخلي الحركة ثابتة وناعمة
    slidesToShow: 7,
    slidesToScroll: 1,
    pauseOnHover: true,
    swipeToSlide: true, // تقدر تسحب بيدك لو حبيت

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase();
    const year = date.getFullYear();
    return { day, month, year };
  };

  return (
    <div className="text-center space-y-4 overflow-hidden"> {/* ✅ يخفي أي overflow يطلع برة */}
      {loading ? (
        <p className="text-gray-400">Loading events...</p>
      ) : error ? (
        <p className="text-gray-400">{error}</p>
      ) : events.length > 0 ? (
        <Slider {...settings}>
          {/* ✅ نكرر البيانات مرتين عشان نضمن الاتصال المستمر */}
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
        <p className="text-gray-400">No events available</p>
      )}
    </div>
  );
};

export default BoxSlider;
