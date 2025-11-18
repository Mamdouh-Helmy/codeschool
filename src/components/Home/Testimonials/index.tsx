"use client";

import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

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

const Testimonials = () => {
  const { t } = useI18n();
  const { locale } = useLocale();
  const isArabic = String(locale || "").startsWith("ar");

  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch("/api/testimonials?featured=true&limit=5");
        const data = await res.json();
        setTestimonials(data.data || []);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  const settings = {
    dots: false,
    infinite: true,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    rtl: isArabic,
    arrows: false,
  };

  if (loading) {
    return (
      <section className="bg-IcyBreeze dark:bg-darklight testimonial">
        <div className="container text-center py-20 text-gray-500 dark:text-gray-300">
          {t("testimonials.loading")}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-IcyBreeze dark:bg-darklight testimonial">
      <div className="container space-y-8">
        <Slider {...settings}>
          {testimonials.map((testimonial) => {
            // normalize student image: could be data:, raw base64, external url, or local path
            const imgRaw = testimonial.studentImage;
            let studentImageFallback = "/images/hero/john.png";

            const { src: studentSrc, useImgTag: studentUseImgTag } =
              getImageInfo(
                imgRaw && String(imgRaw).startsWith("data:")
                  ? imgRaw
                  : imgRaw
                    ? imgRaw
                    : null
              );

            const finalImageSrc = studentSrc || studentImageFallback;

            // decorative big image corner radii mirrored for RTL
            const decorativeStyle = isArabic
              ? {
                borderTopRightRadius: "200px",
                borderBottomLeftRadius: "200px",
                borderTopLeftRadius: "0px",
                borderBottomRightRadius: "0px",
                height: "450px",
              }
              : {
                borderTopLeftRadius: "200px",
                borderBottomRightRadius: "200px",
                borderTopRightRadius: "0px",
                borderBottomLeftRadius: "0px",
                height: "450px",
              };

            // content spacing depending on RTL/LTR
            const contentSpacingClass = isArabic
              ? "md:mr-20 mr-0 text-right"
              : "md:ml-20 ml-0 text-left";

            return (
              <div key={testimonial._id || testimonial.id}>
                <div className="grid md:grid-cols-12 grid-cols-1 items-center">
                  <div
                    className={`col-span-4 relative hidden lg:block overflow-hidden bg-LightSkyBlue ${isArabic ? "md:order-2" : "md:order-1"
                      }`}
                    style={decorativeStyle}
                  >
                    {/* big decorative image */}
                    <img
                      src={finalImageSrc}
                      alt={testimonial.studentName || "testimonial"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "/images/hero/john.png";
                      }}
                    />
                  </div>

                  <div
                    className={`col-span-8 ${isArabic ? "md:order-1" : "md:order-2"
                      } ${contentSpacingClass}`}
                  >
                    <h2 className="text-3xl font-bold text-secondary dark:text-white mb-5">
                      {t("testimonials.heading")}
                    </h2>

                    <p className="text-lg font-normal text-SlateBlueText dark:text-opacity-80 py-5 max-w-632">
                      "{testimonial.comment || t("testimonials.noComment")}"
                    </p>

                    <div
                      className={`flex items-center gap-6 ${isArabic ? "justify-end" : "justify-start"
                        }`}
                    >
                      <div
                        className="rounded-full overflow-hidden bg-gray-200 flex items-center justify-center"
                        style={{
                          width: "80px",
                          height: "80px",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={finalImageSrc}
                          alt={testimonial.studentName}
                          className="object-cover w-full h-full"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "/images/hero/john.png";
                          }}
                        />
                      </div>

                      <div>
                        <p className="text-xl font-medium text-secondary dark:text-white pb-1">
                          {testimonial.studentName ||
                            t("testimonials.anonymous")}
                        </p>
                        <div
                          className={`flex items-center ${isArabic ? "flex-row-reverse" : ""
                            }`}
                        >
                          {Array.from({
                            length: Math.round(testimonial.rating || 5),
                          }).map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 text-yellow-500 ${isArabic ? "me-1" : "ms-1"
                                }`}
                              xmlns="http://www.w3.org/2000/svg"
                              fill="currentColor"
                              viewBox="0 0 22 20"
                            >
                              <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
                            </svg>
                          ))}
                        </div>
                        {testimonial.courseTitle && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t("testimonials.course")}:{" "}
                            <span className="font-medium">
                              {testimonial.courseTitle}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Slider>
      </div>
    </section>
  );
};

export default Testimonials;
