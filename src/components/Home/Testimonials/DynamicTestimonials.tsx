"use client";
import React from "react";
import Image from "next/image";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { useTestimonials } from "@/hooks/useApiData";
import { useI18n } from "@/i18n/I18nProvider";

// Fallback testimonial data
const FALLBACK_TESTIMONIALS = [
  {
    id: "fallback-1",
    name: "Jordhan Daniyel",
    role: "Student",
    company: "Code School",
    content: "My busy schedule leaves little, if any, time for blogging and social media. The Lorem Ipsum Company has been a huge part of helping me grow my business through.",
    rating: 5,
    image: "/images/testimonials/testimonials-profile.png",
    isActive: true,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "fallback-2", 
    name: "Sarah Johnson",
    role: "Frontend Developer",
    company: "TechCorp Inc.",
    content: "The Complete Web Development Bootcamp completely transformed my career. The hands-on approach and real-world projects gave me the confidence to land my dream job.",
    rating: 5,
    image: "/images/testimonials/sarah-johnson.jpg",
    isActive: true,
    createdAt: "2024-04-15T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  }
];

const DynamicTestimonials = () => {
  const { t } = useI18n();
  const { data: testimonialsData, loading, error, source } = useTestimonials({ featured: true, limit: 6 });
  
  // Use API data or fallback
  const testimonials = (testimonialsData as any)?.data || FALLBACK_TESTIMONIALS;
  
  var settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ms-1 ${i < rating ? 'text-yellow-500' : 'text-gray-300'}`}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 22 20"
      >
        <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
      </svg>
    ));
  };

  if (loading) {
    return (
      <section className="bg-IcyBreeze dark:bg-darklight testimonial">
        <div className="container">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="sr-only">{t('common.loading') || 'Loading'}</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-IcyBreeze dark:bg-darklight testimonial">
        <div className="container">
          {source === 'fallback' && (
            <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
                ⚠️ {t('testimonials.cachedNotice') || 'Displaying cached testimonials. Some content may be outdated.'}
              </p>
            </div>
          )}
          
          <div className="space-y-8">
            {testimonials.map((testimonial: any, index: number) => (
              <div key={testimonial.id || index}>
                <div className="grid md:grid-cols-12 grid-cols-1 items-center">
                  <div 
                    data-aos="fade-right" 
                    data-aos-delay="200" 
                    data-aos-duration="1000" 
                    className="col-span-4 bg-LightSkyBlue sm:rounded-br-214 rounded-br-182 sm:rounded-tl-214 rounded-tl-182 relative before:content-[''] before:absolute before:bg-[url('/images/testimonials/quotes.png')] before:w-109 before:h-109 before:-right-10 before:top-32 lg:inline-block hidden"
                  >
                    <Image
                      src={testimonial.image || "/images/testimonials/default.jpg"}
                      alt={testimonial.name}
                      width={0}
                      height={0}
                      quality={100}
                      layout="responsive"
                      sizes="100vh"
                      className="w-full h-full"
                    />
                  </div>
                  <div 
                    data-aos="fade-left" 
                    data-aos-delay="300" 
                    data-aos-duration="1000" 
                    className="col-span-8 md:ml-28 ml-0"
                  >
                    <h2 className="max-w-72">{t('testimonials.heading') || 'What Our Attendees Say'}</h2>
                    <p className="text-lg font-normal text-SlateBlueText dark:text-opacity-80 py-10 max-w-632">
                      {testimonial.content}
                    </p>
                    <div className="flex items-center gap-8">
                      <div>
                        <Image
                          src={testimonial.image || "/images/testimonials/default.jpg"}
                          alt={testimonial.name}
                          width={0}
                          height={0}
                          quality={100}
                          layout="responsive"
                          sizes="100vh"
                          className="!w-16 !h-16 rounded-full"
                        />
                      </div>
                      <div>
                        <p className="text-xl font-medium text-secondary dark:text-white pb-1">
                          {testimonial.name}
                        </p>
                        {testimonial.role && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 pb-2">
                            {testimonial.role}
                            {testimonial.company && ` at ${testimonial.company}`}
                          </p>
                        )}
                        <div className="flex items-center">
                          {renderStars(testimonial.rating || 5)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default DynamicTestimonials;
