// ContactForm.tsx - النسخة المعدلة
"use client";
import React, { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import Image from "next/image";
import toast from "react-hot-toast"; // فقط toast بدون Toaster

const ContactForm = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    specialist: "",
    date: "",
    time: "",
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(t('contact.successMessage') || 'Appointment request submitted successfully!', {
          duration: 5000,
        });

        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          specialist: "",
          date: "",
          time: "",
          message: ""
        });
      } else {
        toast.error(result.message || 'Failed to submit appointment request', {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred. Please try again.', {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* تم إزالة Toaster من هنا */}

      <section className="dark:bg-darkmode lg:pb-24 pb-16 pt-0">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md">
          <div className="grid md:grid-cols-12 grid-cols-1 gap-8">
            <div className="col-span-6">
              <h2 className="max-w-72 text-[40px] leading-[3.4rem] font-bold mb-9 text-secondary">
                {t('contact.getInTouch') || 'Get in Touch'}
              </h2>
              <p className="text-xl text-SlateBlueText mb-6">
                {t('contact.subtitle') || 'Have a question, idea, or request? We\'d love to hear from you.'}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-wrap w-full m-auto justify-between">
                <div className="sm:flex gap-3 w-full">
                  <div className="mx-0 my-2.5 flex-1">
                    <label htmlFor="firstName" className="pb-3 inline-block text-base text-SlateBlueText">
                      {t('contact.firstName') || 'First Name*'}
                    </label>
                    <input
                      id="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full text-base px-4 rounded-lg py-2.5 border-border dark:border-dark_border border-solid dark:text-white dark:bg-darkmode border transition-all duration-500 focus:border-primary dark:focus:border-primary focus:border-solid focus:outline-0"
                      type="text"
                      required
                    />
                  </div>
                  <div className="mx-0 my-2.5 flex-1">
                    <label htmlFor="lastName" className="pb-3 inline-block text-base text-SlateBlueText">
                      {t('contact.lastName') || 'Last Name*'}
                    </label>
                    <input
                      id="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full text-base px-4 py-2.5 rounded-lg border-border dark:border-dark_border border-solid dark:text-white dark:bg-darkmode border transition-all duration-500 focus:border-primary dark:focus:border-primary focus:border-solid focus:outline-0"
                      type="text"
                      required
                    />
                  </div>
                </div>

                <div className="sm:flex gap-3 w-full">
                  <div className="mx-0 my-2.5 flex-1">
                    <label htmlFor="email" className="pb-3 inline-block text-base text-SlateBlueText">
                      {t('contact.email') || 'Email address*'}
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full text-base px-4 py-2.5 rounded-lg border-border dark:border-dark_border border-solid dark:text-white dark:bg-darkmode border transition-all duration-500 focus:border-primary dark:focus:border-primary focus:border-solid focus:outline-0"
                      required
                    />
                  </div>
                  <div className="mx-0 my-2.5 flex-1">
                    <label htmlFor="specialist" className="pb-3 inline-block text-base text-SlateBlueText">
                      {t('contact.specialist') || 'Specialist*'}
                    </label>
                    <select
                      id="specialist"
                      value={formData.specialist}
                      onChange={handleChange}
                      className="w-full text-base px-4 py-2.5 text-SlateBlueText rounded-lg border-border dark:text-white border-solid dark:bg-darkmode border transition-all duration-500 focus:border-primary dark:focus:border-primary dark:border-dark_border focus:border-solid focus:outline-0"
                      required
                    >
                      <option value="">{t('contact.chooseSpecialist') || 'Choose a specialist'}</option>
                      <option value="technical">Technical Support</option>
                      <option value="admission">Admission Advisor</option>
                      <option value="career">Career Counselor</option>
                      <option value="academic">Academic Advisor</option>
                    </select>
                  </div>
                </div>

                <div className="sm:flex gap-3 w-full">
                  <div className="mx-0 my-2.5 flex-1">
                    <label htmlFor="date" className="pb-3 inline-block text-base text-SlateBlueText">
                      {t('contact.date') || 'Date*'}
                    </label>
                    <input
                      id="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="w-full text-base text-SlateBlueText px-4 rounded-lg py-2.5 outline-none dark:text-white dark:bg-darkmode border-border border-solid border transition-all duration-500 focus:border-primary dark:focus:border-primary dark:border-dark_border focus:border-solid focus:outline-0"
                      type="date"
                      required
                    />
                  </div>
                  <div className="mx-0 my-2.5 flex-1">
                    <label htmlFor="time" className="pb-3 inline-block text-base text-SlateBlueText">
                      {t('contact.time') || 'Time*'}
                    </label>
                    <input
                      id="time"
                      value={formData.time}
                      onChange={handleChange}
                      className="w-full text-base px-4 rounded-lg py-2.5 border-border outline-none dark:text-white dark:bg-darkmode border-solid border transition-all duration-500 focus:border-primary dark:focus:border-primary dark:border-dark_border focus:border-solid focus:outline-0"
                      type="time"
                      required
                    />
                  </div>
                </div>

                <div className="mx-0 my-2.5 w-full">
                  <label htmlFor="message" className="pb-3 inline-block text-base text-SlateBlueText">
                    {t('contact.message') || 'Additional Message'}
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full text-base px-4 py-2.5 rounded-lg border-border dark:border-dark_border border-solid dark:text-white dark:bg-darkmode border transition-all duration-500 focus:border-primary dark:focus:border-primary focus:border-solid focus:outline-0"
                    placeholder={t('contact.messagePlaceholder') || 'Tell us more about your inquiry...'}
                  />
                </div>

                <div className="mx-0 my-2.5 w-full">
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 btn btn-1 hover-filled-slide-down overflow-hidden rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    <span>
                      {loading ?
                        (t('contact.submitting') || 'Submitting...') :
                        (t('contact.makeAppointment') || 'Make an appointment')
                      }
                    </span>
                  </button>
                </div>
              </form>
            </div>

            <div className="col-span-6">
              <Image
                src="/images/contact-page/contact.png"
                alt="Contact"
                width={1300}
                height={0}
                quality={100}
                style={{ width: '100%', height: 'auto' }}
                className="bg-no-repeat bg-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ContactForm;