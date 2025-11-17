"use client";
import { useState, useEffect } from "react";
import { useActiveWebinar } from "@/hooks/useApiData";

interface WebinarPopupModalProps {
  onClose: () => void;
  isOpen: boolean;
}

const WebinarPopupModal = ({ onClose, isOpen }: WebinarPopupModalProps) => {
  const { data: activeWebinar, loading, source } = useActiveWebinar();
  const [imageError, setImageError] = useState(false);

  // Don't show modal if no active webinar
  if (!isOpen || loading || !activeWebinar) {
    return null;
  }

  const handleRegisterClick = () => {
    // Open CRM registration URL in new tab
    window.open((activeWebinar as any).crmRegistrationUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const webinar = activeWebinar as any;
  const imageSrc = imageError || !webinar.instructorImage
    ? "/images/instructors/default.jpg"
    : webinar.instructorImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-darkmode p-8 rounded-2xl shadow-2xl w-[90vw] max-w-2xl mx-4 relative animate-fadeIn">
  
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl font-bold"
        >
          ×
        </button>

        {/* Fallback notice */}
        {source === 'fallback' && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              ⚠️ Displaying cached webinar information.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left side - Webinar info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-MidnightNavyText dark:text-white mb-2">
                {webinar.title}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Join our upcoming webinar
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-MidnightNavyText dark:text-white">
                    {formatDate(webinar.date)}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {webinar.time}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-MidnightNavyText dark:text-white">
                    {webinar.instructor}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    Instructor
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-MidnightNavyText dark:text-white">
                    {webinar.currentAttendees} / {webinar.maxAttendees}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    Attendees registered
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleRegisterClick}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>Register Now</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right side - Instructor image */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <img
                src={imageSrc}
                alt={`Instructor ${webinar.instructor}`}
                width={300}
                height={300}
                className="rounded-2xl shadow-lg object-cover w-[300px] h-[300px]"
                onError={handleImageError}
              />
              <div className="absolute -bottom-4 -right-4 bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold">
                Expert Instructor
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebinarPopupModal;