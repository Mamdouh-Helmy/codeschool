"use client";

import React, { useEffect, useState } from "react";
import BoxSlider from "../../SharedComponent/BoxSlider";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

type Speaker = {
  name: string;
  role?: string;
  image?: string;
};

type WebinarItem = {
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

const cleanBase64 = (str?: string) => {
  if (!str) return "";
  return String(str)
    .replace(/\s/g, "")
    .replace(/%[0-9A-F]{2}/gi, "")
    .replaceAll("…", "")
    .trim();
};

const getImageInfo = (img?: string | null) => {
  if (!img) return { src: null as string | null, useImgTag: false, isGif: false };

  const raw = String(img).trim();

  const isDataUri = /^data:image\/[a-zA-Z]+;base64,/.test(raw);
  const isHttp = /^https?:\/\//i.test(raw);
  const isLocal = /^\//.test(raw);
  const isGif = /\.gif(\?|#|$)/i.test(raw) || /^data:image\/gif/i.test(raw);

  const base64Regex = /^[A-Za-z0-9+/=\s]+$/;
  const looksLikeBase64 =
    !isDataUri && !isHttp && !isLocal && raw.length > 100 && base64Regex.test(raw.replace(/\s+/g, ""));

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

const DEFAULT_AVATAR = "/default-avatar.png";

const Upcoming = () => {
  const [upcomingWebinars, setUpcomingWebinars] = useState<WebinarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  // 🔥 دالة للتحقق إذا كان الويبنار لم ينته بعد
  const isWebinarUpcoming = (webinar: WebinarItem) => {
    const now = new Date();
    
    try {
      const webinarDateTime = new Date(`${webinar.date}T${webinar.time || '23:59:59'}`);
      return webinarDateTime > now;
    } catch (error) {
      console.error('Error parsing date:', webinar.date, webinar.time);
      return false;
    }
  };

  useEffect(() => {
    const fetchUpcomingWebinars = async () => {
      try {
        const response = await fetch("/api/webinars");
        const result = await response.json();

        if (result.success) {
          const webinars = result.data || [];
          
          const upcoming = webinars
            .filter((webinar: WebinarItem) => {
              if (!webinar.date || !webinar.time) return false;
              return isWebinarUpcoming(webinar);
            })
            .slice(0, 8);

          setUpcomingWebinars(upcoming);
        } else {
          setUpcomingWebinars([]);
        }
      } catch (error) {
        console.error("Error fetching webinars:", error);
        setUpcomingWebinars([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingWebinars();
  }, []);

  if (loading) {
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

  return (
    <>
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
              <div>
                <div className="flex items-center flex-wrap w-full border border-solid dark:border-dark_border md:px-14 px-6 md:mt-14 mt-6 rounded-22">
                  {upcomingWebinars.map((webinar, index) => (
                    <div
                      key={webinar._id || index}
                      data-aos="fade-up"
                      data-aos-delay={`${index * 300}`}
                      data-aos-duration="1000"
                      className="flex items-center lg:gap-0 gap-4 flex-wrap justify-between w-full md:py-12 py-5 border-b border-solid dark:border-dark_border last:border-b-0"
                    >
                      <div>
                        <h6 className="text-[26px] leading-[2.1rem] font-bold text-secondary dark:text-white max-w-286">
                          {webinar.title}
                        </h6>
                        
                      </div>
                      <div className="flex items-center flex-wrap gap-30">
                        <div className="flex items-center">
                          {webinar.speakers && webinar.speakers.slice(0, 3).length > 0 ? (
                            webinar.speakers.slice(0, 3).map((speaker, profileIndex) => {
                              const { src, useImgTag } = getImageInfo(speaker.image || DEFAULT_AVATAR);
                              const key = `${webinar._id || index}-sp-${profileIndex}`;
                              if (!src) {
                                return (
                                  <div
                                    key={key}
                                    className={`!w-16 !h-16 rounded-full bg-gray-200 ${profileIndex !== webinar.speakers!.slice(0, 3).length - 1 ? "-mr-3" : ""
                                      }`}
                                  />
                                );
                              }
                              if (useImgTag) {
                                return (
                                  <img
                                    key={key}
                                    src={src}
                                    alt={speaker.name}
                                    width={64}
                                    height={64}
                                    loading="lazy"
                                    className={`!w-16 !h-16 rounded-full object-cover ${profileIndex !== webinar.speakers!.slice(0, 3).length - 1 ? "-mr-3" : ""
                                      }`}
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                                    }}
                                  />
                                );
                              }
                              return (
                                <Image
                                  key={key}
                                  src={src}
                                  alt={speaker.name}
                                  width={64}
                                  height={64}
                                  quality={100}
                                  className={`!w-16 !h-16 rounded-full object-cover ${profileIndex !== webinar.speakers!.slice(0, 3).length - 1 ? "-mr-3" : ""
                                    }`}
                                />
                              );
                            })
                          ) : webinar.instructorImage ? (
                            (() => {
                              const { src, useImgTag } = getImageInfo(webinar.instructorImage || DEFAULT_AVATAR);
                              if (!src) {
                                return <div className="!w-16 !h-16 rounded-full bg-gray-200" />;
                              }
                              return useImgTag ? (
                                <img
                                  src={src}
                                  alt={webinar.instructor || "instructor"}
                                  width={64}
                                  height={64}
                                  loading="lazy"
                                  className="!w-16 !h-16 rounded-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                                  }}
                                />
                              ) : (
                                <Image
                                  src={src}
                                  alt={webinar.instructor || "instructor"}
                                  width={64}
                                  height={64}
                                  quality={100}
                                  className="!w-16 !h-16 rounded-full object-cover"
                                />
                              );
                            })()
                          ) : (
                            <Image
                              src={DEFAULT_AVATAR}
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
                            {t("upcoming.speechBy")}
                          </p>
                          <p className="text-lg font-medium text-secondary dark:text-white">
                            {webinar.speakers && webinar.speakers.length > 0
                              ? webinar.speakers.map((s) => s.name).join(", ")
                              : webinar.instructor || t("upcoming.tba")}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Link
                          href={webinar.crmRegistrationUrl || "#"}
                          className="btn_outline btn-2 btn_outline hover-outline-slide-down"
                        >
                          <span>{t("upcoming.registerNow")}</span>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {upcomingWebinars.length === 0 && (
                    <div className="w-full py-12 text-center">
                      <p className="text-lg text-gray-500 dark:text-gray-400">{t("upcoming.noEvents")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Upcoming;