// components/WebinarRegistrationForm.tsx
"use client";
import { useState, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { X, Calendar, Clock, User, Users, Mail, Phone, Building, Briefcase, MessageCircle } from "lucide-react";

interface Webinar {
  _id: string;
  title: string;
  date: string;
  time: string;
  formattedDate: string;
  formattedTime: string;
  instructor: string;
  maxAttendees: number;
  currentAttendees: number;
}

interface UserProfile {
  phone?: string;
  company?: string;
  jobTitle?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  profile?: UserProfile;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  questions: string;
}

interface WebinarRegistrationFormProps {
  webinar: Webinar;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const WebinarRegistrationForm: React.FC<WebinarRegistrationFormProps> = ({ 
  webinar, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    questions: ""
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // جلب بيانات المستخدم المسجل دخول
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/users/me');
        const result = await res.json();
        if (result.success && result.user) {
          setUser(result.user);
          // تعبئة البيانات تلقائياً من حساب المستخدم
          setFormData(prev => ({
            ...prev,
            name: result.user.name,
            email: result.user.email,
            phone: result.user.profile?.phone || "",
            company: result.user.profile?.company || "",
            jobTitle: result.user.profile?.jobTitle || ""
          }));
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    if (isOpen) {
      fetchUser();
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/webinars/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webinarId: webinar._id,
          ...formData
        })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        alert(result.message || "Registration failed");
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert("An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const availableSpots = webinar.maxAttendees - webinar.currentAttendees;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-darkmode rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-PowderBlueBorder dark:border-dark_border">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 bg-gray-100 dark:bg-dark_input rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-dark_border transition-colors"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-darktext" />
          </button>
          
          <div className="flex items-center gap-3 mt-10 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-MidnightNavyText dark:text-white">
                {t("webinarRegistration.title") || "Register for Webinar"}
              </h2>
              <p className="text-SlateBlueText dark:text-darktext mt-1">
                {t("webinarRegistration.subtitle") || "Complete your registration details"}
              </p>
            </div>
          </div>

          {/* Webinar Info */}
          <div className="bg-IcyBreeze dark:bg-dark_input rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-MidnightNavyText dark:text-white text-lg">
              {webinar.title}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-SlateBlueText dark:text-darktext">
                <Calendar className="w-4 h-4" />
                <span>{webinar.formattedDate}</span>
              </div>
              
              <div className="flex items-center gap-2 text-SlateBlueText dark:text-darktext">
                <Clock className="w-4 h-4" />
                <span>{webinar.formattedTime}</span>
              </div>
              
              <div className="flex items-center gap-2 text-SlateBlueText dark:text-darktext">
                <User className="w-4 h-4" />
                <span>{webinar.instructor}</span>
              </div>
              
              <div className="flex items-center gap-2 text-SlateBlueText dark:text-darktext">
                <Users className="w-4 h-4" />
                <span>{availableSpots} {t("webinarRegistration.spotsAvailable") || "spots available"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {t("webinarRegistration.personalInfo") || "Personal Information"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  {t("webinarRegistration.fullName") || "Full Name"} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={t("webinarRegistration.namePlaceholder") || "Enter your full name"}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  {t("webinarRegistration.email") || "Email Address"} *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={t("webinarRegistration.emailPlaceholder") || "your@email.com"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                {t("webinarRegistration.phone") || "Phone Number"}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder={t("webinarRegistration.phonePlaceholder") || "+1 (555) 123-4567"}
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              {t("webinarRegistration.professionalInfo") || "Professional Information"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  {t("webinarRegistration.company") || "Company/Organization"}
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={t("webinarRegistration.companyPlaceholder") || "Your company name"}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {t("webinarRegistration.jobTitle") || "Job Title"}
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder={t("webinarRegistration.jobTitlePlaceholder") || "Your position"}
                />
              </div>
            </div>
          </div>

          {/* Additional Questions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              {t("webinarRegistration.additionalInfo") || "Additional Information"}
            </h3>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-MidnightNavyText dark:text-white">
                {t("webinarRegistration.questions") || "Questions for the Instructor"}
              </label>
              <textarea
                name="questions"
                value={formData.questions}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border rounded-lg bg-white dark:bg-dark_input text-MidnightNavyText dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                placeholder={t("webinarRegistration.questionsPlaceholder") || "Any specific questions you'd like the instructor to address during the webinar..."}
              />
            </div>
          </div>

          {/* Terms and Submit */}
          <div className="space-y-4 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
            <div className="flex items-start gap-3">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  required
                  className="w-4 h-4 text-primary focus:ring-primary border-PowderBlueBorder rounded"
                />
              </div>
              <div className="text-sm text-SlateBlueText dark:text-darktext">
                <p>
                  {t("webinarRegistration.terms") || "I agree to receive communications about this webinar and acknowledge that my information will be processed in accordance with the privacy policy."}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md"
              >
                {t("common.cancel") || "Cancel"}
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t("webinarRegistration.registering") || "Registering..."}
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    {t("webinarRegistration.registerNow") || "Register Now"}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Login Notice */}
          {!user && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t("webinarRegistration.loginNotice") || "Please make sure you are logged in to complete your registration."}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default WebinarRegistrationForm;