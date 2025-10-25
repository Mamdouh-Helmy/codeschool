"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "@/app/context/LocaleContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ThumbnailCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { dir } = useLocale();

  const isRTL = dir === "rtl";

  const images = [
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&h=780&q=80",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&h=780&q=80",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&h=780&q=80",
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&h=780&q=80",
  ];

  const nextSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  // Auto-slide
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Main Carousel */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            direction: "ltr",
          }}
        >
          {images.map((src, index) => (
            <div key={index} className="w-full flex-shrink-0">
              {/* الصورة الكبيرة */}
              <img
                src={src}
                alt={`Young Innovator ${index + 1}`}
                className="w-full h-full object-cover aspect-[4/3] rounded-3xl"
              />
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={isRTL ? nextSlide : prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-darkmode/80 hover:bg-white dark:hover:bg-darkmode text-primary p-2 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={isRTL ? prevSlide : nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 dark:bg-darkmode/80 hover:bg-white dark:hover:bg-darkmode text-primary p-2 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex justify-center gap-3 mt-6">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentIndex === index
                ? "bg-primary scale-125"
                : "bg-primary/30 hover:bg-primary/50"
            }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 w-full bg-primary/20 rounded-full h-1">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-500"
          style={{
            width: `${((currentIndex + 1) / images.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

export default ThumbnailCarousel;
