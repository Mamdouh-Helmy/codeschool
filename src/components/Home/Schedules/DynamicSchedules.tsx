"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEvents } from "@/hooks/useApiData";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

// Fallback schedule data
const FALLBACK_SCHEDULE_DATA = {
  conferences: [
    {
      id: "conf-1",
      title: "Welcome & Opening Keynote",
      speakers: "Dr. Sarah Johnson, CEO",
      profiles: ["/images/speakers/sarah-johnson.jpg"],
      buttonText: "Join Now",
      buttonLink: "/events/welcome-keynote",
      time: "9:00 AM - 10:00 AM"
    },
    {
      id: "conf-2", 
      title: "The Future of Web Development",
      speakers: "Michael Chen, CTO",
      profiles: ["/images/speakers/michael-chen.jpg"],
      buttonText: "Join Now",
      buttonLink: "/events/web-development",
      time: "10:30 AM - 11:30 AM"
    },
    {
      id: "conf-3",
      title: "Data Science in Practice",
      speakers: "Dr. Emily Rodriguez, Lead Data Scientist",
      profiles: ["/images/speakers/emily-rodriguez.jpg"],
      buttonText: "Join Now", 
      buttonLink: "/events/data-science",
      time: "2:00 PM - 3:00 PM"
    },
    {
      id: "conf-4",
      title: "Building Scalable Applications",
      speakers: "David Kim, Senior Architect",
      profiles: ["/images/speakers/david-kim.jpg"],
      buttonText: "Join Now",
      buttonLink: "/events/scalable-apps",
      time: "3:30 PM - 4:30 PM"
    }
  ],
  intermissions: [
    {
      id: "break-1",
      title: "Coffee Break",
      time: "11:30 AM - 12:00 PM",
      image: "/images/schedule/coffee-break.jpg"
    },
    {
      id: "break-2", 
      title: "Lunch Break",
      time: "12:00 PM - 2:00 PM",
      image: "/images/schedule/lunch-break.jpg"
    }
  ]
};

const DynamicSchedules = () => {
  const { t } = useI18n();
  const { formatDate } = useLocale();
  const { data: eventsData, loading, error, source } = useEvents({ upcoming: true, limit: 10 });
  
  // Transform events data to match the expected format
  const conferences = (eventsData as any)?.data?.map((event: any) => ({
    id: event.id,
    title: event.title,
    speakers: event.instructor || t('schedules.tba') || 'TBA',
    profiles: [event.image || "/images/speakers/default.jpg"],
    buttonText: t('schedules.joinNow') || 'Join Now',
    buttonLink: `/events/${event.id}`,
    time: `${event.time} - ${formatDate(event.date)}`
  })) || FALLBACK_SCHEDULE_DATA.conferences;

  const intermissions = FALLBACK_SCHEDULE_DATA.intermissions;

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full border border-solid border-border dark:border-dark_border md:px-14 px-6 md:mt-14 mt-6 rounded-22 py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {source === 'fallback' && (
        <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
            ⚠️ {t('schedules.cachedNotice') || 'Displaying cached schedule. Some events may be outdated.'}
          </p>
        </div>
      )}
      
      <div className="flex items-center flex-wrap w-full border border-solid border-border dark:border-dark_border md:px-14 px-6 md:mt-14 mt-6 rounded-22">
        {conferences.map((conference: any, index: number) => (
          <React.Fragment key={conference.id || index}>
            <div 
              data-aos="fade-up" 
              data-aos-delay={`${index*200}`} 
              data-aos-duration="1000"  
              className="flex items-center flex-wrap gap-6 justify-between w-full md:py-12 py-5 border-b border-solid border-border dark:border-dark_border last:border-b-0"
            >
              <div className="lg:min-w-96 min-w-max">
                <h6 className="text-[26px] leading-[2.1rem] font-bold text-secondary dark:text-white max-w-286">
                  {conference.title}
                </h6>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {conference.time}
                </p>
              </div>
              <div className="flex items-center flex-wrap gap-30 lg:min-w-96 min-w-max">
                <div className="flex items-center">
                  {conference.profiles.map((profile: any, profileIndex: number) => (
                    <Image
                      key={profileIndex}
                      src={profile}
                      alt="profile"
                      width={0}
                      height={0}
                      quality={100}
                      layout="responsive"
                      sizes="100vh"
                      className={`!w-16 !h-16 rounded-full ${
                        profileIndex !== conference.profiles.length - 1
                          ? "-mr-3"
                          : ""
                      }`}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-lg font-normal text-SlateBlueText dark:text-opacity-80">
                    {t('schedules.speechBy') || 'Speech by'}
                  </p>
                  <p className="text-lg font-medium text-secondary dark:text-white">
                    {conference.speakers}
                  </p>
                </div>
              </div>
              <div className="lg:min-w-40 min-w-max">
                <Link
                  href={conference.buttonLink}
                  className="btn_outline btn-2 btn_outline hover-outline-slide-down"
                >
                  <span>{conference.buttonText}</span>
                </Link>
              </div>
            </div>

            {/* Insert intermissions at appropriate places */}
            {index === 1 && (
              <div 
                data-aos="fade-up" 
                data-aos-delay={`${index*200}`} 
                data-aos-duration="1000" 
                className="flex items-center flex-wrap justify-between w-full md:py-12 py-5 border-b border-solid border-border dark:border-dark_border"
              >
                <div className="lg:min-w-96 min-w-max">
                  <h6 className="text-[26px] leading-[2.1rem] font-bold text-secondary dark:text-white max-w-286">
                    {intermissions[0].title}
                  </h6>
                </div>
                <div className="flex items-center flex-wrap gap-30 lg:min-w-96 min-w-max">
                  <div className="flex items-center">
                    <Image
                      src={intermissions[0].image}
                      alt="coffee break"
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
                      {intermissions[0].time}
                    </p>
                  </div>
                </div>
                <div className="lg:min-w-40 min-w-max"></div>
              </div>
            )}

            {index === 3 && (
              <div 
                data-aos="fade-up" 
                data-aos-delay={`${index*200}`} 
                data-aos-duration="1000" 
                className="flex items-center flex-wrap justify-between w-full md:py-12 py-5 border-b border-solid border-border dark:border-dark_border"
              >
                <div className="lg:min-w-96 min-w-max">
                  <h6 className="text-[26px] leading-[2.1rem] font-bold text-secondary dark:text-white max-w-286">
                    {intermissions[1].title}
                  </h6>
                </div>
                <div className="flex items-center flex-wrap gap-30 lg:min-w-96 min-w-max">
                  <div className="flex items-center">
                    <Image
                      src={intermissions[1].image}
                      alt="lunch break"
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
                      {intermissions[1].time}
                    </p>
                  </div>
                </div>
                <div className="lg:min-w-40 min-w-max"></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

export default DynamicSchedules;
