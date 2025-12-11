// components/Portfolio/public/ContactSection.tsx
"use client";
import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import contactImg from "../../../../public/images/portfolio/img/contact-img.svg";
import "animate.css";
import TrackVisibility from "react-on-screen";
import Image from "next/image";
import toast from "react-hot-toast";
import { PublicPortfolio } from "@/types/portfolio";
import { useI18n } from "@/i18n/I18nProvider";

interface ContactSectionProps {
  portfolio: PublicPortfolio;
  themeStyles?: any;
}

// Custom Inputs Component
const Inputs = ({ 
  handlerChange, 
  name, 
  type, 
  value, 
  placeholder, 
  error, 
  half = false 
}: { 
  handlerChange: any;
  name: string;
  type: string;
  value: string;
  placeholder: string;
  error?: string;
  half?: boolean;
}) => {
  return (
    <div className={`relative ${half ? 'sm:col-span-1' : 'col-span-2'}`}>
      <input
        onChange={handlerChange}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        className="input w-full bg-white/10 border border-white/30 text-white placeholder-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm sm:text-base"
      />
      {error && (
        <p className="text-red-400 text-xs sm:text-sm mt-1 absolute -bottom-5 sm:-bottom-6 left-0">
          {error}
        </p>
      )}
    </div>
  );
};

// Custom Textarea Component
const Textarea = ({ 
  handlerChange, 
  name, 
  value, 
  placeholder, 
  error 
}: { 
  handlerChange: any;
  name: string;
  value: string;
  placeholder: string;
  error?: string;
}) => {
  return (
    <div className="relative col-span-2">
      <textarea
        onChange={handlerChange}
        name={name}
        value={value}
        placeholder={placeholder}
        rows={4}
        className="input w-full bg-white/10 border border-white/30 text-white placeholder-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none min-h-32 sm:min-h-40 text-sm sm:text-base"
      />
      {error && (
        <p className="text-red-400 text-xs sm:text-sm mt-1 absolute -bottom-5 sm:-bottom-6 left-0">
          {error}
        </p>
      )}
    </div>
  );
};

export default function ContactSection({ portfolio }: ContactSectionProps) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const validationSchema = Yup.object({
    firstName: Yup.string()
      .required("First Name is required")
      .min(2, "First name is too short")
      .max(50, "First name is too long"),
    lastName: Yup.string()
      .required("Last Name is required")
      .min(2, "Last name is too short")
      .max(50, "Last name is too long"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required")
      .max(100, "Email is too long"),
    phoneNumber: Yup.string()
      .required("Phone number is required")
      .matches(/^[0-9+\-\s()]{10,20}$/, "Invalid phone number")
      .max(20, "Phone number is too long"),
    message: Yup.string()
      .required("Message is required")
      .min(10, "Message should be at least 10 characters")
      .max(2000, "Message is too long (max 2000 characters)")
  });

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      message: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      const toastId = toast.loading("Sending Message...");
      
      try {
        // إرسال الرسالة إلى API
        const response = await fetch('/api/portfolio/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            portfolioId: portfolio._id,
            senderInfo: {
              firstName: values.firstName.trim(),
              lastName: values.lastName.trim(),
              email: values.email.trim(),
              phoneNumber: values.phoneNumber.trim()
            },
            message: values.message.trim()
          })
        });

        const data = await response.json();

        toast.dismiss(toastId);
        
        if (data.success) {
          toast.success("Message sent successfully!");
          resetForm();
          
          // إظهار معلومات تأكيد إضافية
          toast.custom((t) => (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                ✅ Message sent to {portfolio.userId?.name || 'portfolio owner'}
              </p>
              <p className="text-green-600 text-sm mt-1">
                A confirmation email has been sent to {values.email}
              </p>
            </div>
          ));
        } else {
          // عرض الأخطاء إذا وجدت
          if (data.errors && Array.isArray(data.errors)) {
            data.errors.forEach((error: string) => {
              toast.error(error, { duration: 4000 });
            });
          } else {
            toast.error(data.message || "Failed to send message");
          }
        }
      } catch (error: any) {
        toast.dismiss(toastId);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          toast.error("Unable to connect to server. Please check your internet connection.", {
            duration: 5000
          });
        } else {
          toast.error("Something went wrong, please try again!");
        }
        
        console.error("Send message error:", error);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const { handleChange, errors, values, touched, handleSubmit } = formik;

  return (
    <section
      className="bg-gradient-to-r from-[#AA367C] to-[#4A2FBD] pt-8 sm:pt-12 md:pt-16 lg:pt-[60px] pb-12 sm:pb-16 md:pb-20 lg:pb-[120px]"
      id="connect"
    >
      <div className="container mx-auto px-3 sm:px-4 md:px-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-6 md:gap-8 items-center">
          {/* Left Column - Image */}
          <div className="lg:col-span-6 col-span-12 order-2 lg:order-1">
            <TrackVisibility>
              {({ isVisible }) => (
                <Image
                  className={`w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto ${
                    isVisible ? "animate__animated animate__zoomIn" : ""
                  }`}
                  src={contactImg}
                  alt="Contact Us"
                  priority
                />
              )}
            </TrackVisibility>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-6 col-span-12 order-1 lg:order-2">
            <TrackVisibility>
              {({ isVisible }) => (
                <div
                  className={`p-4 sm:p-6 md:p-8 rounded-lg ${
                    isVisible ? "animate__animated animate__fadeIn" : ""
                  }`}
                >
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 sm:mb-8 md:mb-10">
                    {t("portfolio.public.getInTouch") || "Get In Touch"}
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <Inputs
                        handlerChange={handleChange}
                        name="firstName"
                        type="text"
                        value={values.firstName}
                        placeholder="First Name"
                        error={touched.firstName && errors.firstName ? errors.firstName : undefined}
                        half
                      />
                      
                      <Inputs
                        handlerChange={handleChange}
                        name="lastName"
                        type="text"
                        value={values.lastName}
                        placeholder="Last Name"
                        error={touched.lastName && errors.lastName ? errors.lastName : undefined}
                        half
                      />
                      
                      <Inputs
                        handlerChange={handleChange}
                        name="email"
                        type="email"
                        value={values.email}
                        placeholder="Email Address"
                        error={touched.email && errors.email ? errors.email : undefined}
                        half
                      />
                      
                      <Inputs
                        handlerChange={handleChange}
                        name="phoneNumber"
                        type="tel"
                        value={values.phoneNumber}
                        placeholder="Phone Number"
                        error={touched.phoneNumber && errors.phoneNumber ? errors.phoneNumber : undefined}
                        half
                      />
                      
                      <Textarea
                        handlerChange={handleChange}
                        name="message"
                        value={values.message}
                        placeholder="Your Message"
                        error={touched.message && errors.message ? errors.message : undefined}
                      />
                    </div>
                    
                    <div className="z-10 relative">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="relative overflow-hidden capitalize group px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 text-base sm:text-lg font-semibold text-white border border-white transition bg-transparent hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        <span className="absolute block w-full -left-full group-hover:left-0 top-0 bg-white h-full z-[-1] duration-300"></span>
                        {isLoading ? "Sending..." : t("portfolio.public.send") || "Send"}
                      </button>
                    </div>
                  </form>

                  {/* Contact Info */}
                  <div className="mt-6 sm:mt-8 md:mt-10 lg:mt-12 pt-4 sm:pt-6 md:pt-8 border-t border-white/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {portfolio.contactInfo?.email && (
                        <div className="text-center">
                          <h4 className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Email</h4>
                          <a 
                            href={`mailto:${portfolio.contactInfo.email}`}
                            className="text-gray-200 hover:text-white transition-colors text-xs sm:text-sm md:text-base break-all"
                          >
                            {portfolio.contactInfo.email}
                          </a>
                        </div>
                      )}
                      
                      {portfolio.contactInfo?.phone && (
                        <div className="text-center">
                          <h4 className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Phone</h4>
                          <a 
                            href={`tel:${portfolio.contactInfo.phone}`}
                            className="text-gray-200 hover:text-white transition-colors text-xs sm:text-sm md:text-base"
                          >
                            {portfolio.contactInfo.phone}
                          </a>
                        </div>
                      )}
                      
                      {portfolio.contactInfo?.location && (
                        <div className="text-center sm:col-span-2 lg:col-span-1">
                          <h4 className="text-white font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Location</h4>
                          <p className="text-gray-200 text-xs sm:text-sm md:text-base">{portfolio.contactInfo.location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TrackVisibility>
          </div>
        </div>
      </div>
    </section>
  );
}