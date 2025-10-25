"use client";

import React, { useEffect, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useI18n } from "@/i18n/I18nProvider";

// 🔧 تنظيف base64 لتجنب مشاكل URL
const cleanBase64 = (str: string) => {
  if (!str) return "";
  return str.replace(/\s/g, "").replace(/%[0-9A-F]{2}/gi, "").replaceAll("…", "").trim();
};

const Testimonials = () => {
  const { t } = useI18n(); // ✅ هذه دالة الترجمة
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
          {testimonials.map((testimonial) => { // ✅ غيرنا الاسم من t إلى testimonial
            const studentImage =
              testimonial.studentImage && testimonial.studentImage.startsWith("data:")
                ? cleanBase64(testimonial.studentImage)
                : "/images/hero/john.png";

            return (
              <div key={testimonial._id || testimonial.id}>
                <div className="grid md:grid-cols-12 grid-cols-1 items-center">
                  
                  {/* ✅ الصورة الجانبية بنفس الشكل - حجم ثابت */}
                  <div
                    className="col-span-4 relative hidden lg:block overflow-hidden bg-LightSkyBlue"
                    style={{
                      borderTopLeftRadius: "200px",
                      borderBottomRightRadius: "200px",
                      borderTopRightRadius: "0px",
                      borderBottomLeftRadius: "0px",
                      height: "450px",
                    }}
                  >
                    <img
                      src={studentImage}
                      alt={testimonial.studentName || "testimonial"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      style={{
                        objectFit: "cover",
                        width: "100%",
                        height: "100%",
                      }}
                      onError={(e) => {
                        e.currentTarget.src = "/images/hero/john.png";
                      }}
                    />
                  </div>

                  {/* ✅ النص */}
                  <div className="col-span-8 md:ml-20 ml-0">
                    <h2 className="text-3xl font-bold text-secondary dark:text-white mb-5">
                      {t("testimonials.heading")} {/* ✅ الآن تعمل */}
                    </h2>

                    <p className="text-lg font-normal text-SlateBlueText dark:text-opacity-80 py-5 max-w-632">
                      "{testimonial.comment || t("testimonials.noComment")}" {/* ✅ صححنا هنا أيضًا */}
                    </p>

                    <div className="flex items-center gap-6">
                      {/* ✅ الصورة الدائرية - حجم ثابت ومتناسق */}
                      <div
                        className="rounded-full overflow-hidden bg-gray-200 flex items-center justify-center"
                        style={{
                          width: "80px",
                          height: "80px",
                          flexShrink: 0,
                        }}
                      >
                        <img
                          src={studentImage}
                          alt={testimonial.studentName}
                          className="object-cover w-full h-full"
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.currentTarget.src = "/images/hero/john.png";
                          }}
                        />
                      </div>

                      <div>
                        <p className="text-xl font-medium text-secondary dark:text-white pb-1">
                          {testimonial.studentName || t("testimonials.anonymous")} {/* ✅ صححنا هنا أيضًا */}
                        </p>
                        <div className="flex items-center">
                          {Array.from({ length: Math.round(testimonial.rating || 5) }).map((_, i) => (
                            <svg
                              key={i}
                              className="w-4 h-4 text-yellow-500 ms-1"
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
                            <span className="font-medium">{testimonial.courseTitle}</span>
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