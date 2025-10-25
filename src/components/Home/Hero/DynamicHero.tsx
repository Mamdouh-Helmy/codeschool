"use client";
import { useState, MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useEvents, useCourses, useActiveWebinar } from "@/hooks/useApiData";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

// Fallback data
const FALLBACK_HERO_DATA = {
  title: "Empower Young Minds!",
  description: "Whether at home, in the classroom, or anywhere in between, Code School offers a dynamic, game-based learning environment that makes coding accessible for every child aged 6–18 including those with learning difficulties. We are dedicated to tech-inclusive education, empowering students through personalized support and hands-on skill development led by certified, bilingual (Arabic & English) mentors. With international K-12 standards, our programs are thoughtfully designed to ignite creativity, enhance logical reasoning and build lasting confidence. Prepare your child for success in the digital age with a program you can trust.",
  nextEvent: "Join our next webinar on October 2, 2025.",
  featuredStudents: [
    {
      name: "Yassen Abdallah",
      course: "Machine Learning",
      image: "/images/hero/john.png",
      color: "bg-[#8c52ff]"
    },
    {
      name: "Frida Abdallah", 
      course: "Web Development",
      image: "/images/hero/maria.png",
      color: "bg-[#ffbd59]"
    }
  ]
};

const DynamicHero = () => {
  const { t } = useI18n();
  const { formatDate } = useLocale();
  const [showFullText, setShowFullText] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Fetch upcoming events
  const { data: eventsData, source: eventsSource } = useEvents({ upcoming: true, limit: 1 });
  
  // Fetch featured courses
  const { data: coursesData, source: coursesSource } = useCourses({ featured: true, limit: 2 });

  // Fetch active webinar
  const { data: activeWebinar, source: webinarSource } = useActiveWebinar();

  // Get the next event or use fallback
  const nextEvent = (eventsData as any)?.data?.[0]
    ? t('hero.nextEvent', { title: (eventsData as any).data[0].title, date: formatDate((eventsData as any).data[0].date) })
    : FALLBACK_HERO_DATA.nextEvent;

  // Get webinar announcement text
  const getWebinarAnnouncement = () => {
    if (activeWebinar) {
      const webinar = activeWebinar as any;
      const webinarDate = formatDate(webinar.date);
      return t('hero.webinar', { title: webinar.title, date: webinarDate });
    }
    return FALLBACK_HERO_DATA.nextEvent;
  };

  const webinarAnnouncement = getWebinarAnnouncement();

  // Get featured students from courses or use fallback
  const featuredStudents = (coursesData as any)?.data?.slice(0, 2).map((course: any, index: number) => ({
    name: course.instructor,
    course: course.title,
    image: FALLBACK_HERO_DATA.featuredStudents[index]?.image || "/images/hero/default.jpg",
    color: index === 0 ? "bg-[#8c52ff]" : "bg-[#ffbd59]"
  })) || FALLBACK_HERO_DATA.featuredStudents;

  const preview = FALLBACK_HERO_DATA.description.split(" ").slice(0, 36).join(" ") + "...";

  const closeModal = () => {
    setShowFullText(false);
    setShowVideo(false);
  };

  // Show fallback notice if using fallback data
  const showFallbackNotice = eventsSource === 'fallback' || coursesSource === 'fallback' || webinarSource === 'fallback';

  return (
    <section className="dark:bg-darkmode">
      <div className="container">
        <div className="grid lg:grid-cols-12 grid-cols-1 items-center gap-30">
          <div className="col-span-6">
            {showFallbackNotice && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Displaying cached content. Some features may be limited.
                </p>
              </div>
            )}
            
            {activeWebinar ? (
              <a
                href={(activeWebinar as any).crmRegistrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-aos="fade-up"
                data-aos-delay="200"
                data-aos-duration="1000"
                className="relative z-0 inline-block text-primary text-lg font-bold hover:text-primary/80 transition-colors duration-200 cursor-pointer before:absolute before:content-[''] before:bg-primary/20 before:w-full before:h-2 before:-z-1 dark:before:-z-1 before:bottom-0"
              >
                {webinarAnnouncement}
              </a>
            ) : (
              <p
                data-aos="fade-up"
                data-aos-delay="200"
                data-aos-duration="1000"
                className="relative z-0 inline-block text-primary text-lg font-bold before:absolute before:content-[''] before:bg-primary/20 before:w-full before:h-2 before:-z-1 dark:before:-z-1 before:bottom-0"
              >
                {webinarAnnouncement}
              </p>
            )}
            <h1
              className="py-4"
              data-aos="fade-up"
              data-aos-delay="300"
              data-aos-duration="1000"
            >
              {t('hero.title')}
            </h1>
            <p
              data-aos="fade-up"
              data-aos-delay="400"
              data-aos-duration="1000"
              className="text-xl text-SlateBlueText dark:text-opacity-80 font-normal md:pb-14 pb-6"
            >
              {preview}
              <button
                onClick={() => setShowFullText(true)}
                className="ml-2 text-[#8c52ff] underline font-semibold"
              >
                {t('hero.readMore')}
              </button>
            </p>

            <div className="flex items-center md:justify-normal lg:justify-center justify-start flex-wrap gap-4">
              <Link
                href="/courses"
                data-aos="fade-up"
                data-aos-delay="500"
                data-aos-duration="1000"
                className="btn btn-1 hover-filled-slide-down rounded-lg overflow-hidden"
              >
                <span className="!flex !items-center gap-14">
                  <i className="bg-[url('/images/hero/tickets.svg')] bg-no-repeat bg-contain w-6 h-6 inline-block filter brightness-0"></i>
                  {t('hero.browseCourses',) || 'Browse Courses'}
                </span>
              </Link>
              <button
                onClick={() => setShowVideo(true)}
                data-aos="fade-up"
                data-aos-delay="600"
                data-aos-duration="1000"
                className="btn_outline btn-2 hover-outline-slide-down group"
              >
                <span className="!flex !items-center gap-14">
                  <i className="bg-[url('/images/hero/calander.svg')] bg-no-repeat bg-contain w-6 h-6 inline-block group-hover:bg-[url('/images/hero/calander-hover-white.svg')] filter brightness-0"></i>
                  {t('hero.watchDemo')}
                </span>
              </button>
            </div>
          </div>

          {/* Right side with dynamic student images */}
          <div
            data-aos="fade-left"
            data-aos-delay="200"
            data-aos-duration="1000"
            className="col-span-6 lg:flex hidden items-center gap-3"
          >
            {featuredStudents.map((student: any, index: number) => (
              <div key={index} className={`${student.color} relative rounded-tl-166 rounded-br-166 w-full ${index === 1 ? 'mt-32' : ''}`}>
                <Image
                  src={student.image}
                  alt={student.name}
                  width={400}
                  height={500}
                  quality={100}
                  className="w-full h-full"
                />
                <div className={`${index === 0 ? 'bg-[#8c52ff]' : 'bg-[#ffbd59]'} rounded-22 shadow-hero-box py-4 px-5 absolute ${index === 0 ? 'top-16 -left-20' : 'top-24 -right-20 xl:inline-block hidden'}`}>
                  <p className="text-lg font-bold text-white">{student.name}</p>
                  <p className="text-base font-medium text-white text-center">
                    {student.course}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal for full text */}
      {showFullText && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-darkmode p-6 rounded-lg shadow-xl w-[70vw] max-w-none mx-4 relative animate-fadeIn font-sans text-base text-SlateBlueText"
          >
            <h2 className="text-2xl font-bold text-[#8c52ff] mb-4">
              {FALLBACK_HERO_DATA.title}
            </h2>
            <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">
              {FALLBACK_HERO_DATA.description}
            </p>
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-[#8c52ff] text-xl font-bold hover:opacity-80"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Modal for video demo */}
      {showVideo && (
        <div
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-darkmode p-6 rounded-lg shadow-xl w-[70vw] max-w-none mx-4 relative animate-fadeIn"
          >
            <h2 className="text-2xl font-bold text-[#8c52ff] mb-4">
              Watch Demo
            </h2>
            <div className="relative pb-[56.25%] h-0 overflow-hidden rounded">
              <iframe
                src="https://www.youtube.com/embed/1oDrJba2PSs?autoplay=1"
                className="absolute top-0 left-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Code School Demo"
              />
            </div>
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-[#8c52ff] text-xl font-bold hover:opacity-80"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default DynamicHero;
