"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Speaker = {
  name: string;
  role: string;
  image: string;
};

type ScheduleEvent = {
  _id?: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  image?: string;
  speakers: Speaker[];
  tags?: string[];
  isActive: boolean;
  type?: "session" | "break";
};

const Schedules = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedules", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch schedule");
        const result = await res.json();

        // ✅ منطق احترافي لتحديد نوع الحدث تلقائيًا (break أو session)
        const normalized = (result.data || []).map((e: ScheduleEvent) => ({
          ...e,
          type:
            e.tags?.some((t) =>
              ["break", "coffee", "lunch", "pause", "networking"].includes(
                t.toLowerCase()
              )
            ) || /break/i.test(e.title)
              ? "break"
              : "session",
        }));

        setEvents(normalized);
      } catch (err) {
        console.error("Error fetching schedule:", err);
        setError("Failed to load schedule");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  if (loading)
    return <p className="text-gray-400 text-center">Loading schedule...</p>;
  if (error) return <p className="text-red-500 text-center">{error}</p>;
  if (events.length === 0)
    return <p className="text-gray-400 text-center">No schedule found</p>;
 
  return (
    <div className="flex items-center flex-wrap w-full border border-solid border-border dark:border-dark_border md:px-14 px-6 md:mt-14 mt-6 rounded-22">
      {events.map((event, index) => (
        <React.Fragment key={event._id || index}>
          {event.type === "break" ? (
            // ☕ استراحة
            <div
              data-aos="fade-up"
              data-aos-delay={`${index * 200}`}
              data-aos-duration="1000"
              className="flex items-center flex-wrap justify-between w-full md:py-12 py-5 border-b border-solid border-border dark:border-dark_border"
            >
              <div className="lg:min-w-96 min-w-max">
                <h6 className="text-[26px] leading-[2.1rem] font-bold text-secondary dark:text-white max-w-286">
                  {event.title}
                </h6>
              </div>
              <div className="flex items-center flex-wrap gap-30 lg:min-w-96 min-w-max">
                <div className="flex items-center">
                  <Image
                    src={event.image || "/images/default.jpg"}
                    alt={event.title}
                    width={0}
                    height={0}
                    quality={100}
                    layout="responsive"
                    sizes="100vh"
                    className="!w-10 !h-10 rounded-full"
                  />
                </div>
                <div>
                  <p className="text-lg font-normal text-SlateBlueText dark:text-opacity-80">
                    {event.time}
                  </p>
                </div>
              </div>
              <div className="lg:min-w-40 min-w-max"></div>
            </div>
          ) : (
            // 🎤 جلسة عادية (مؤتمر / ورشة)
            <div
              data-aos="fade-up"
              data-aos-delay={`${index * 200}`}
              data-aos-duration="1000"
              className="flex items-center flex-wrap gap-6 justify-between w-full md:py-12 py-5 border-b border-solid border-border dark:border-dark_border last:border-b-0"
            >
              <div className="lg:min-w-96 min-w-max">
                <h6 className="text-[26px] leading-[2.1rem] font-bold text-secondary dark:text-white max-w-286">
                  {event.title}
                </h6>
              </div>

              <div className="flex items-center flex-wrap gap-30 lg:min-w-96 min-w-max">
                <div className="flex items-center">
                  {event.speakers.length > 0 ? (
                    event.speakers.map((spk, i) => (
                      <Image
                        key={i}
                        src={spk.image || "/images/default-avatar.jpg"}
                        alt={spk.name}
                        width={0}
                        height={0}
                        quality={100}
                        layout="responsive"
                        sizes="100vh"
                        className={`!w-16 !h-16 rounded-full ${
                          i !== event.speakers.length - 1 ? "-mr-3" : ""
                        }`}
                      />
                    ))
                  ) : (
                    <Image
                      src="/images/default-avatar.jpg"
                      alt="Speaker"
                      width={0}
                      height={0}
                      quality={100}
                      layout="responsive"
                      sizes="100vh"
                      className="!w-16 !h-16 rounded-full"
                    />
                  )}
                </div>

                <div>
                  <p className="text-lg font-normal text-SlateBlueText dark:text-opacity-80">
                    Speech by
                  </p>
                  <p className="text-lg font-medium text-secondary dark:text-white">
                    {event.speakers.length > 0
                      ? event.speakers.map((s) => s.name).join(", ")
                      : "To be announced"}
                  </p>
                </div>
              </div>

              <div className="lg:min-w-40 min-w-max">
                <Link
                  href={`/events/${event._id}`}
                  className="btn_outline btn-2 btn_outline hover-outline-slide-down"
                >
                  <span>Details</span>
                </Link>
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Schedules;
