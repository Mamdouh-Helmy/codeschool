"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type PricingPlan = {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
};

const DynamicPricing = () => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [subscribedPlans, setSubscribedPlans] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const planIdFromQuery = searchParams.get("plan");

  // ✅ جلب الباقات من الـ API مباشرة
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/pricing", { cache: "no-store" });
        const result = await res.json();

        if (result.success && result.data?.length > 0) {
          setPlans(result.data);
        } else {
          setError("No plans available.");
        }
      } catch (err) {
        console.error("Fetch pricing error:", err);
        setError("Failed to load pricing plans.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // ✅ تحديد الخطة المختارة من URL
  useEffect(() => {
    if (planIdFromQuery) setSelectedPlan(planIdFromQuery);
  }, [planIdFromQuery]);

  // ✅ جلب اشتراكات المستخدم (من الكوكيز يتم معرفة المستخدم تلقائيًا)
  useEffect(() => {
    const fetchUserSubscriptions = async () => {
      try {
        const res = await fetch("/api/subscriptions", { cache: "no-store" });
        if (!res.ok) return;
        const result = await res.json();
        if (result.success && result.data?.length > 0) {
          const userSubs = result.data
            .filter((sub: any) => sub.status !== "cancelled")
            .map((sub: any) => sub.plan?._id || sub.plan);
          setSubscribedPlans(userSubs);
        }
      } catch (error) {
        console.error("Error fetching user subscriptions:", error);
      }
    };

    fetchUserSubscriptions();
  }, []);

  // ✅ الاشتراك في الخطة
  const handleSubscribe = async (planId: string) => {
    if (subscribedPlans.includes(planId)) {
      toast.error("You are already subscribed to this plan.");
      return;
    }

    // If user is not authenticated, redirect to signin page with callback
      if (!auth?.isAuthenticated) {
        // Try to verify server-side session (cookie) in case client state is out-of-sync
        try {
          const sess = await fetch("/api/auth/session", { cache: "no-store" });
          if (sess.ok) {
            const sessJson = await sess.json();
            if (sessJson?.success && sessJson?.loggedIn) {
              // Sync minimal client state so UI behaves as logged in
              try {
                if (sessJson.user) localStorage.setItem("user", JSON.stringify(sessJson.user));
              } catch (e) {
                console.warn("Failed to sync user to localStorage", e);
              }
              // proceed to subscription flow (no redirect)
            } else {
              toast.error("Please login to subscribe.");
              const callback = pathname || "/";
              
              return;
            }
          } else {
            toast.error("Please login to subscribe.");
            const callback = pathname || "/";
            
            return;
          }
        } catch (e) {
          console.error("Session check failed:", e);
          toast.error("Please login to subscribe.");
          const callback = pathname || "/";
          router.push(`/signin?callbackUrl=${encodeURIComponent(callback)}&plan=${planId}`);
          return;
        }
      }

    try {
      setProcessing(true);

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          paymentMethod: "manual",
          studentCount: 1,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success("Subscription successful!");
        setSubscribedPlans((prev) => [...prev, planId]); // add to list
        setTimeout(() => {
          router.push(`/subscriptions?plan=${planId}`);
        }, 1500);
      } else if (res.status === 401) {
        // Not authenticated according to server - redirect to signin
        toast.error("Please login first.");
        const callback = pathname || "/";
        router.push(`/signin?callbackUrl=${encodeURIComponent(callback)}&plan=${planId}`);
      } else {
        toast.error(result.message || "Subscription failed.");
      }
    } catch (err) {
      toast.error("Error while subscribing.");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading)
    return (
      <div className="py-20 text-center text-gray-500">Loading plans...</div>
    );

  if (error)
    return <div className="py-20 text-center text-red-500">{error}</div>;

  return (
    <section className="bg-LightSkyBlue dark:bg-darklight py-20 mt-6">
      <Toaster position="top-center" />
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const isSelected =
              selectedPlan === plan.id || selectedPlan === plan._id;
            const isSubscribed = subscribedPlans.includes(plan._id || plan.id!); // ✅ تحقق إذا كان مشترك بالفعل

            return (
              <div
                key={plan._id || plan.id}
                className={`relative bg-white dark:bg-darkmode rounded-2xl shadow-lg p-8 transition-all ${
                  isSelected
                    ? "ring-4 ring-primary scale-105"
                    : "hover:shadow-xl"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Selected
                  </div>
                )}

                <h3 className="text-2xl font-bold text-center mb-3">
                  {plan.name}
                </h3>
                <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
                  {plan.description}
                </p>
                <p className="text-center text-4xl font-bold text-primary mb-6">
                  {plan.price} {plan.currency}
                  <span className="text-gray-500 text-base ml-1">
                    /{plan.billingPeriod}
                  </span>
                </p>

                {isSubscribed ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span>Subscribed</span>
                  </button>
                ) : isSelected ? (
                  <button
                    onClick={() => handleSubscribe(plan._id!)}
                    disabled={processing}
                    className={`w-full py-3 rounded-lg font-semibold transition ${
                      processing
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90"
                    }`}
                  >
                    {processing ? "Processing..." : "Subscribe Now"}
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedPlan(plan._id!)}
                    disabled={processing}
                    className={`block w-full py-3 text-center border rounded-lg font-semibold transition ${
                      processing
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "border-gray-300 text-MidnightNavyText dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    Choose Plan
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DynamicPricing;
