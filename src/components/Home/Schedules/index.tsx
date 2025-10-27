"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

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

const cleanBase64 = (str?: string) => {
  if (!str) return "";
  return String(str)
    .replace(/\s/g, "")
    .replace(/%[0-9A-F]{2}/gi, "")
    .replaceAll("…", "")
    .trim();
};

const getImageInfo = (img?: string | null) => {
  if (!img)
    return { src: null as string | null, useImgTag: false, isGif: false };

  const raw = String(img).trim();

  const isDataUri = /^data:image\/[a-zA-Z]+;base64,/.test(raw);
  const isHttp = /^https?:\/\//i.test(raw);
  const isLocal = /^\//.test(raw);
  const isGif = /\.gif(\?|#|$)/i.test(raw) || /^data:image\/gif/i.test(raw);

  const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
  const looksLikeBase64 =
    !isDataUri &&
    !isHttp &&
    !isLocal &&
    raw.length > 100 &&
    base64Regex.test(raw.replace(/\s+/g, ""));

  if (isDataUri) {
    return { src: raw, useImgTag: true, isGif };
  }

  if (looksLikeBase64) {
    const dataUri = `data:image/png;base64,${cleanBase64(raw)}`;
    return { src: dataUri, useImgTag: true, isGif: false };
  }

  if (isHttp) {
    return { src: raw, useImgTag: true, isGif };
  }

  if (isLocal) {
    return { src: raw, useImgTag: isGif, isGif };
  }

  const assumed = raw.startsWith("/") ? raw : `/${raw}`;
  const assumedIsGif = /\.gif(\?|#|$)/i.test(assumed);
  return { src: assumed, useImgTag: assumedIsGif, isGif: assumedIsGif };
};

const Schedules = () => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch("/api/schedules", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch schedule");
        const result = await res.json();

        const normalized = (result.data || []).map((e: ScheduleEvent) => ({
          ...e,
          type:
            e.tags?.some((t) =>
              ["break", "coffee", "lunch", "pause", "networking"].includes(
                String(t).toLowerCase()
              )
            ) || /break/i.test(e.title)
              ? ("break" as const)
              : ("session" as const),
        }));

        setEvents(normalized);
      } catch (err) {
        console.error("Error fetching schedule:", err);
        setError(t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [t]);

  if (loading)
    return <p className="text-gray-400 text-center">{t("common.loading")}</p>;
  if (error) return <p className="text-red-500 text-center">{error}</p>;
  if (events.length === 0)
    return <p className="text-gray-400 text-center">{t("schedules.tba")}</p>;

  return (
    <div className="flex items-center flex-wrap w-full border border-solid border-border dark:border-dark_border md:px-14 px-6 md:mt-14 mt-6 rounded-22">
      {events.map((event, index) => (
        <React.Fragment key={event._id || index}>
          {event.type === "break" ? (
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
                  {(() => {
                    const { src, useImgTag } = getImageInfo(
                      event.image || "/images/default.jpg"
                    );
                    if (!src) {
                      return (
                        <div className="!w-10 !h-10 rounded-full bg-gray-200" />
                      );
                    }
                    return useImgTag ? (
                      <img
                        src={src}
                        alt={event.title}
                        className="!w-10 !h-10 rounded-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/images/default.jpg";
                        }}
                      />
                    ) : (
                      <Image
                        src={src}
                        alt={event.title}
                        width={40}
                        height={40}
                        quality={100}
                        className="!w-10 !h-10 rounded-full object-cover"
                      />
                    );
                  })()}
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
                    event.speakers.map((spk, i) => {
                      const { src, useImgTag } = getImageInfo(
                        spk.image || "/images/default-avatar.jpg"
                      );
                      if (!src) {
                        return (
                          <div
                            key={i}
                            className={`!w-16 !h-16 rounded-full bg-gray-200 ${
                              i !== event.speakers.length - 1 ? "-mr-3" : ""
                            }`}
                          />
                        );
                      }
                      return useImgTag ? (
                        <img
                          key={i}
                          src={src}
                          alt={spk.name}
                          className={`!w-16 !h-16 rounded-full object-cover ${
                            i !== event.speakers.length - 1 ? "-mr-3" : ""
                          }`}
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "/images/default-avatar.jpg";
                          }}
                        />
                      ) : (
                        <Image
                          key={i}
                          src={src}
                          alt={spk.name}
                          width={64}
                          height={64}
                          quality={100}
                          className={`!w-16 !h-16 rounded-full object-cover ${
                            i !== event.speakers.length - 1 ? "-mr-3" : ""
                          }`}
                        />
                      );
                    })
                  ) : (
                    <Image
                      src="/images/default-avatar.jpg"
                      alt="Speaker"
                      width={64}
                      height={64}
                      quality={100}
                      className="!w-16 !h-16 rounded-full"
                    />
                  )}
                </div>

                <div>
                  <p className="text-lg font-normal text-SlateBlueText dark:text-opacity-80">
                    {t("schedules.speechBy")}
                  </p>
                  <div className="text-lg font-medium text-secondary dark:text-white">
                    {event.speakers.length > 0 ? (
                      <span className="flex flex-col md:inline-block">
                        {event.speakers.map((s, index) => (
                          <span key={index} className="md:inline block">
                            {s.name}
                            {index < event.speakers.length - 1 && (
                              <span className="md:inline hidden">, </span>
                            )}
                          </span>
                        ))}
                      </span>
                    ) : (
                      t("schedules.tba")
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:min-w-40 min-w-max">
                <Link
                  href={`/events/${event._id}`}
                  className="btn_outline btn-2 btn_outline hover-outline-slide-down"
                >
                  <span>{t("common.details")}</span>
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
