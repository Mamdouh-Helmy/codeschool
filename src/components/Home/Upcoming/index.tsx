"use client";

import React, { useEffect, useState } from "react";
import BoxSlider from "../../SharedComponent/BoxSlider";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

// ─── Types ────────────────────────────────────────────────────────────────────
type Speaker = {
  name: string;
  role?: string;
  image?: string;
};

type EventItem = {
  _id?: string;
  title: string;
  date: string;
  time: string;
  speakers?: Speaker[];
  instructor?: string;
  instructorImage?: string;
  crmRegistrationUrl?: string;
  [key: string]: any;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_AVATAR = "/default-avatar.png";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isValidUrl = (str: string) =>
  /^https?:\/\//i.test(str) || str.startsWith("/");

const resolveImageSrc = (img?: string | null): string => {
  if (!img) return DEFAULT_AVATAR;
  const raw = img.trim();
  if (isValidUrl(raw)) return raw;
  if (raw.length > 100) return `data:image/png;base64,${raw.replace(/\s/g, "")}`;
  return DEFAULT_AVATAR;
};

const parseEventDate = (event: EventItem): Date | null => {
  try {
    const { date, time } = event;
    if (!date) return null;

    // لو date فيها T بالفعل → ISO string كامل، نستخدمها مباشرة
    if (date.includes("T")) {
      const d = new Date(date);
      return isNaN(d.getTime()) ? null : d;
    }

    // date فقط بدون وقت
    const dateStr = time ? `${date}T${time}` : `${date}T23:59:59`;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const isUpcoming = (event: EventItem): boolean => {
  const d = parseEventDate(event);
  return d ? d > new Date() : false;
};

const sortByDate = (events: EventItem[]): EventItem[] =>
  [...events].sort((a, b) => {
    const da = parseEventDate(a)?.getTime() ?? 0;
    const db = parseEventDate(b)?.getTime() ?? 0;
    return da - db;
  });

// ─── Sub-components ───────────────────────────────────────────────────────────
function AvatarImage({
  src,
  alt,
  overlap = false,
}: {
  src: string;
  alt: string;
  overlap?: boolean;
}) {
  const cls = `!w-16 !h-16 rounded-full object-cover${overlap ? " -mr-3" : ""}`;

  return (
    <img
      src={src}
      alt={alt}
      width={64}
      height={64}
      loading="lazy"
      className={cls}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
      }}
    />
  );
}

function SpeakerAvatars({ event }: { event: EventItem }) {
  const speakers = event.speakers?.slice(0, 3) ?? [];

  if (speakers.length > 0) {
    return (
      <>
        {speakers.map((speaker, i) => (
          <AvatarImage
            key={`${event._id}-sp-${i}`}
            src={resolveImageSrc(speaker.image)}
            alt={speaker.name}
            overlap={i < speakers.length - 1}
          />
        ))}
      </>
    );
  }

  return (
    <AvatarImage
      src={resolveImageSrc(event.instructorImage)}
      alt={event.instructor || "Speaker"}
    />
  );
}

function SpeakerNames({ event }: { event: EventItem }) {
  const { t } = useI18n();

  if (event.speakers && event.speakers.length > 0)
    return <>{event.speakers.map((s) => s.name).join(", ")}</>;

  return <>{event.instructor || t("upcoming.tba")}</>;
}

function EventRow({ event, index }: { event: EventItem; index: number }) {
  const { t } = useI18n();
  const upcoming = isUpcoming(event);

  return (
    <div
      data-aos="fade-up"
      data-aos-delay={`${index * 300}`}
      data-aos-duration="1000"
      className="flex items-center lg:gap-0 gap-4 flex-wrap justify-between w-full md:py-12 py-5 border-b border-solid dark:border-dark_border last:border-b-0"
    >
      {/* Title */}
      <h6
        className={`text-[26px] leading-[2.1rem] font-bold max-w-286 ${
          upcoming
            ? "text-secondary dark:text-white"
            : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {event.title}
      </h6>

      {/* Speaker info */}
      <div className="flex items-center flex-wrap gap-30">
        <div className={`flex items-center ${!upcoming ? "opacity-50" : ""}`}>
          <SpeakerAvatars event={event} />
        </div>
        <div>
          <p className="text-lg font-normal text-SlateBlueText dark:text-white dark:text-opacity-80">
            {t("upcoming.speechBy")}
          </p>
          <p
            className={`text-lg font-medium ${
              upcoming
                ? "text-secondary dark:text-white"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            <SpeakerNames event={event} />
          </p>
        </div>
      </div>

      {/* CTA — يظهر فقط للـ events القادمة */}
      {upcoming ? (
        <Link
          href={event.crmRegistrationUrl || "#"}
          className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 inline-block"
        >
          {t("upcoming.registerNow")}
        </Link>
      ) : (
        <span className="text-sm font-medium text-gray-400 dark:text-gray-500 px-6 py-3">
          {t("upcoming.ended")}
        </span>
      )}
    </div>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="w-full py-12 text-center">
      <p className="text-lg text-gray-500 dark:text-gray-400">
        {t("upcoming.noEvents")}
      </p>
    </div>
  );
}

function LoadingState() {
  const { t } = useI18n();
  return (
    <section className="upcoming dark:bg-darkmode">
      <div className="max-w-1068 m-auto">
        <div className="container">
          <h2 className="text-center pb-10">{t("upcoming.title")}</h2>
          <div className="text-center">{t("common.loading")}</div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Upcoming = () => {
  const { t } = useI18n();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events");
        const result = await res.json();

        if (result.success) {
          const allEvents: EventItem[] = result.data ?? [];

          // Debug مؤقت — احذفه بعد ما تتأكد
          if (process.env.NODE_ENV === "development") {
            console.table(
              allEvents.map((e) => ({
                title: e.title,
                date: e.date,
                time: e.time,
                parsed: parseEventDate(e)?.toISOString() ?? "INVALID",
                isUpcoming: isUpcoming(e),
              }))
            );
          }

          // كل الـ events تظهر — القادمة أولاً ثم القديمة
          setEvents(
            [...allEvents].sort((a, b) => {
              const da = parseEventDate(a)?.getTime() ?? 0;
              const db = parseEventDate(b)?.getTime() ?? 0;
              return db - da;
            })
          );
        }
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <section className="upcoming dark:bg-darkmode">
      <div className="max-w-1068 m-auto">
        <div className="container">
          <h2
            data-aos="fade-up"
            data-aos-delay="200"
            data-aos-duration="1000"
            className="text-center pb-10"
          >
            {t("upcoming.title")}
          </h2>

          <div>
            <div data-aos="fade-up" data-aos-delay="300" data-aos-duration="1000">
              <BoxSlider />
            </div>

            <div className="flex items-center flex-wrap w-full border border-solid dark:border-dark_border md:px-14 px-6 md:mt-14 mt-6 rounded-22 max-h-[400px] overflow-y-auto no-scrollbar">
              {events.length > 0 ? (
                events.map((event, i) => (
                  <EventRow key={event._id ?? i} event={event} index={i} />
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Upcoming;