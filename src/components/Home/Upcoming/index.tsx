"use client";
import React, { useEffect, useState } from "react";
import BoxSlider from "../../SharedComponent/BoxSlider";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

const Upcoming = () => {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const result = await response.json();
        
        if (result.success) {
          // تصفية الأحداث القادمة فقط (بناءً على التاريخ)
          const now = new Date();
          const upcoming = result.data.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= now;
          }).slice(0, 2); // أخذ أول حدثين قادمين فقط
          
          setUpcomingEvents(upcoming);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingEvents();
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
            <h2 data-aos="fade-up" data-aos-delay="200" data-aos-duration="1000" className="text-center pb-10">
              {t("upcoming.title")}
            </h2>
            <div>
              <div data-aos="fade-up" data-aos-delay="300" data-aos-duration="1000">
                <BoxSlider />
              </div>
              <div>
                <div className="flex items-center flex-wrap w-full border border-solid dark:border-dark_border md:px-14 px-6 md:mt-14 mt-6 rounded-22">
                  {upcomingEvents.map((event, index) => (
                    <div
                      key={event._id}
                      data-aos="fade-up" data-aos-delay={`${index*300}`} data-aos-duration="1000"
                      className="flex items-center lg:gap-0 gap-4 flex-wrap justify-between w-full md:py-12 py-5 border-b border-solid dark:border-dark_border last:border-b-0"
                    >
                      <div>
                        <h6 className="text-[26px] leading-[2.1rem] font-bold text-secondary dark:text-white max-w-286">
                          {event.title}
                        </h6>
                      </div>
                      <div className="flex items-center flex-wrap gap-30">
                        <div className="flex items-center">
                          {event.speakers && event.speakers.slice(0, 3).map((speaker, profileIndex) => (
                            <Image
                              key={profileIndex}
                              src={speaker.image || "/default-avatar.png"}
                              alt={speaker.name}
                              width={64}
                              height={64}
                              quality={100}
                              className={`!w-16 !h-16 rounded-full object-cover ${
                                profileIndex !== event.speakers.slice(0, 3).length - 1
                                  ? "-mr-3"
                                  : ""
                              }`}
                            />
                          ))}
                          {(!event.speakers || event.speakers.length === 0) && event.instructorImage && (
                            <Image
                              src={event.instructorImage}
                              alt={event.instructor}
                              width={64}
                              height={64}
                              quality={100}
                              className="!w-16 !h-16 rounded-full object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-normal text-SlateBlueText dark:text-opacity-80">
                            {t("upcoming.speechBy")}
                          </p>
                          <p className="text-lg font-medium text-secondary dark:text-white">
                            {event.speakers && event.speakers.length > 0 
                              ? event.speakers.map(s => s.name).join(", ")
                              : event.instructor || t("upcoming.tba")
                            }
                          </p>
                        </div>
                      </div>
                      <div>
                        <Link
                          href={event.crmRegistrationUrl || "#"}
                          className="btn_outline btn-2 btn_outline hover-outline-slide-down"
                        >
                          <span>{t("upcoming.registerNow")}</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                  
                  {upcomingEvents.length === 0 && (
                    <div className="w-full py-12 text-center">
                      <p className="text-lg text-gray-500 dark:text-gray-400">
                        {t("upcoming.noEvents")}
                      </p>
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