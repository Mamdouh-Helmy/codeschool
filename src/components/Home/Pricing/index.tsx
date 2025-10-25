"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { usePricing } from "@/hooks/useApiData";
import { PricingPlan } from "@/lib/types";

const HomePricing: React.FC = () => {
  const router = useRouter();
  const { data: pricingData, loading } = usePricing();
  const plans: PricingPlan[] = (pricingData as any)?.data || [];

  if (loading) {
    return null;
  }

  const handleSelect = (planId: string) => {
    router.push(`/pricing?plan=${encodeURIComponent(planId)}`);
  };

  return (
    <section className="bg-LightSkyBlue dark:bg-darklight py-16">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-MidnightNavyText dark:text-white mb-3">Choose Your Learning Path</h2>
          <p className="text-SlateBlueText dark:text-darktext">Flexible pricing options designed to meet your educational needs. Start your coding journey today with our expert instructors.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.slice(0, 3).map((plan) => (
            <div
              key={plan.id}
              className={`group relative bg-white dark:bg-darkmode rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer ${
                plan.isPopular ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleSelect(plan.id)}
            >
              {plan.isPopular && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">Most Popular</span>
                </div>
              )}

              <div className="p-8 text-center border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-2xl font-bold text-MidnightNavyText dark:text-white mb-2">{plan.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-primary">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency, minimumFractionDigits: 0 }).format(plan.price)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">/{plan.billingPeriod}</span>
                </div>
                <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">Invoice payment option available</div>
              </div>

              <ul className="p-8 space-y-3">
                {plan.features.slice(0, 5).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-sm">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                      <svg className="h-3 w-3 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="px-8 pb-8">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelect(plan.id); }}
                  className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-primary/90"
                >
                  Subscribe by Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomePricing;


