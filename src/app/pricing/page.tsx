"use client";
import { useState, useEffect } from "react";
import { usePricing } from "@/hooks/useApiData";
import { PricingPlan, SubscriptionRequest } from "@/lib/types";
import { Metadata } from "next";
import { useI18n } from "@/i18n/I18nProvider";

// Note: Metadata should be in a separate file for App Router
// export const metadata: Metadata = {
//   title: "Pricing Plans | CodeSchool",
//   description: "Choose the perfect learning plan for your coding journey. Flexible pricing options for Arabic and English instruction.",
// };

const PricingPage = () => {
  const { data: pricingData, loading, error, source } = usePricing();
  const { t } = useI18n();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [formData, setFormData] = useState<SubscriptionRequest>({
    planId: "",
    studentCount: 1,
    paymentMethod: "invoice",
    notes: "",
    contactInfo: {
      name: "",
      email: "",
      phone: "",
      company: ""
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Use API data or fallback
  const plans = (pricingData as any)?.data || [];

  useEffect(() => {
    // Get plan from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('plan');
    if (planId && plans.length > 0) {
      const plan = plans.find((p: PricingPlan) => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
        setFormData(prev => ({ ...prev, planId: plan.id }));
      }
    }
  }, [plans]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('contactInfo.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          planId: selectedPlan?.id || "",
          studentCount: 1,
          paymentMethod: "invoice",
          notes: "",
          contactInfo: {
            name: "",
            email: "",
            phone: "",
            company: ""
          }
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting subscription:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getLanguageFlag = (language: string) => {
    return language === 'arabic' ? '🇸🇦' : '🇺🇸';
  };

  const getTypeIcon = (type: string) => {
    return type === 'group' ? '👥' : '👤';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-LightSkyBlue dark:bg-darklight flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{t('pricing.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-LightSkyBlue dark:bg-darklight py-20">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-MidnightNavyText dark:text-white mb-6">{t('pricing.choose')}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Flexible pricing options designed to meet your educational needs. 
            Start your coding journey today with our expert instructors.
          </p>
        </div>

        {/* Fallback notice */}
        {source === "fallback" && (
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-200 mb-8 max-w-4xl mx-auto">
            ⚠️ Displaying cached pricing information. Some content may be outdated.
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {plans.map((plan: PricingPlan, index: number) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-darkmode rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer ${
                plan.isPopular ? 'ring-2 ring-primary scale-105' : ''
              } ${selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => {
                setSelectedPlan(plan);
                setFormData(prev => ({ ...prev, planId: plan.id }));
              }}
            >
              {/* Popular Badge */}
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-primary text-white px-6 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="p-8 text-center border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <span className="text-3xl">{getLanguageFlag(plan.language)}</span>
                  <span className="text-3xl">{getTypeIcon(plan.type)}</span>
                </div>
                
                <h3 className="text-2xl font-bold text-MidnightNavyText dark:text-white mb-2">
                  {plan.name}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {plan.description}
                </p>

                <div className="mb-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-bold text-primary">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      /{plan.billingPeriod}
                    </span>
                  </div>
                </div>

                {plan.maxStudents && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Up to {plan.maxStudents} student{plan.maxStudents > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="p-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Selection Indicator */}
              {selectedPlan?.id === plan.id && (
                <div className="absolute top-4 right-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Subscription Form */}
        {selectedPlan && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-darkmode rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-MidnightNavyText dark:text-white mb-6 text-center">{t('pricing.subscribe')} • {selectedPlan.name}</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Plan Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-MidnightNavyText dark:text-white">
                        {selectedPlan.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {selectedPlan.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {formatPrice(selectedPlan.price, selectedPlan.currency)}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        per {selectedPlan.billingPeriod}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Students
                    </label>
                    <input
                      type="number"
                      name="studentCount"
                      value={formData.studentCount}
                      onChange={handleInputChange}
                      min="1"
                      max={selectedPlan.maxStudents || 100}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method
                    </label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="invoice">Invoice</option>
                      <option value="card">Credit Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="contactInfo.name"
                      value={formData.contactInfo.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="contactInfo.email"
                      value={formData.contactInfo.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="contactInfo.phone"
                      value={formData.contactInfo.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company/Organization
                    </label>
                    <input
                      type="text"
                      name="contactInfo.company"
                      value={formData.contactInfo.company}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Any special requirements or questions..."
                  />
                </div>

                {/* Total Amount */}
                <div className="bg-primary/10 rounded-lg p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white">{t('pricing.total')}</h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {formData.studentCount} student{formData.studentCount > 1 ? 's' : ''} × {formatPrice(selectedPlan.price, selectedPlan.currency)}
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {formatPrice(selectedPlan.price * formData.studentCount, selectedPlan.currency)}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="text-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Processing...' : t('pricing.subscribe')}
                  </button>
                </div>

                {/* Status Messages */}
                {submitStatus === 'success' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-green-800 dark:text-green-200">
                        Subscription request submitted successfully! We'll contact you soon with payment details.
                      </p>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-red-800 dark:text-red-200">
                        There was an error submitting your request. Please try again.
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPage;

