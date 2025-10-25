"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  User,
  Users,
  DollarSign,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Package,
  Euro,
} from "lucide-react";
import EgyptianPoundIcon from "../../icons/EgyptianPoundIcon";
import SubscriptionsForm from "./SubscriptionsForm"; // تأكد من المسار الصحيح

interface Subscription {
  _id: string;
  user: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  plan: {
    _id: string;
    name?: string;
    price?: number;
    duration?: number;
    features?: string[];
    currency?: string;
  } | null;
  status: "pending" | "active" | "cancelled" | "expired";
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod: string;
  startDate: string;
  endDate: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
  studentCount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export default function SubscriptionsAdmin() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      if (json.success) {
        setSubscriptions(json.data || []);
      } else {
        toast.error(json.message || "Failed to load subscriptions");
      }
    } catch (err: any) {
      console.error("Error loading subscriptions:", err);
      toast.error("Failed to load subscriptions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  // دالة لإرجاع أيقونة العملة المناسبة
  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case "USD":
        return <DollarSign className="w-4 h-4" />;
      case "EUR":
        return <Euro className="w-4 h-4" />;
      case "EGP":
        return <EgyptianPoundIcon size={16} />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  // دالة لعرض السعر مع العملة
  const formatPrice = (amount: number, currency: string) => {
    return `${amount} ${currency}`;
  };

  const deleteSubscription = async (id: string) => {
    toast(
      (t) => (
        <div className="w-404 max-w-full bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none dark:border-dark_border p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold">
              !
            </div>
            <div className="flex-1">
              <p className="text-16 font-semibold">
                Are you sure you want to delete this subscription?
              </p>
              <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                This action cannot be undone and will remove all subscription data.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded-14 text-15 hover:bg-red-700 shadow-sm"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const res = await fetch(
                    `/api/subscriptions?id=${encodeURIComponent(id)}`,
                    {
                      method: "DELETE",
                    }
                  );
                  if (res.ok) {
                    setSubscriptions((prev) =>
                      prev.filter((s) => s._id !== id)
                    );
                    toast.success("Subscription deleted successfully");
                  } else {
                    toast.error("Failed to delete the subscription");
                  }
                } catch (err) {
                  console.error("Error deleting subscription:", err);
                  toast.error("Error deleting subscription");
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30";
      case "pending":
        return "bg-LightYellow/20 text-amber-700 dark:bg-LightYellow/30";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30";
      case "expired":
        return "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30";
      default:
        return "bg-gray-200 text-gray-700 dark:bg-gray-700";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30";
      case "pending":
        return "bg-LightYellow/20 text-amber-700 dark:bg-LightYellow/30";
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30";
      default:
        return "bg-gray-200 text-gray-700 dark:bg-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-3 h-3" />;
      case "pending":
        return <Clock className="w-3 h-3" />;
      case "cancelled":
        return <XCircle className="w-3 h-3" />;
      case "expired":
        return <Clock className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  // دالة مساعدة للحصول على اسم المستخدم بشكل آمن
  const getUserName = (user: any) => {
    return user?.name || user?.email || "Unknown User";
  };

  // دالة مساعدة للحصول على اسم الخطة بشكل آمن
  const getPlanName = (plan: any) => {
    return plan?.name || "Unknown Plan";
  };

  // دالة مساعدة للحصول على الحرف الأول من اسم المستخدم
  const getUserInitial = (user: any) => {
    const name = getUserName(user);
    return name.charAt(0).toUpperCase();
  };

  // دالة لتنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // دالة لعرض تفاصيل الاشتراك
  const showSubscriptionDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowDetails(true);
  };

  // دالة لإغلاق تفاصيل الاشتراك
  const closeSubscriptionDetails = () => {
    setShowDetails(false);
    setSelectedSubscription(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-sm p-6 border border-PowderBlueBorder dark:border-dark_border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-MidnightNavyText dark:text-white flex items-center gap-3">
              <Package className="w-7 h-7 text-primary" />
              Subscriptions Management
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              Manage all user subscriptions, track payment status, and monitor
              subscription activities.
            </p>
          </div>
          <div className="mt-4 lg:mt-0">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              Total: {subscriptions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Active Subscriptions
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {subscriptions.filter((s) => s.status === "active").length}
              </p>
            </div>
            <div className="w-10 h-10 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-Aquamarine" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Pending Payments
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {
                  subscriptions.filter((s) => s.paymentStatus === "pending")
                    .length
                }
              </p>
            </div>
            <div className="w-10 h-10 bg-LightYellow/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-LightYellow" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {subscriptions.reduce(
                  (acc, s) => acc + (s.totalAmount || 0),
                  0
                )}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                Active Users
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {
                  new Set(subscriptions.map((s) => s.user?._id).filter(Boolean))
                    .size
                }
              </p>
            </div>
            <div className="w-10 h-10 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-ElectricAqua" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {subscriptions.map((subscription) => (
          <div
            key={subscription._id}
            className={`relative rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md ${
              subscription.status === "active"
                ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
                : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
            }`}
          >
            <div className="p-6">
              {/* Status Badges */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(
                    subscription.status
                  )}`}
                >
                  {getStatusIcon(subscription.status)}
                  {subscription.status}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(
                    subscription.paymentStatus
                  )}`}
                >
                  {subscription.paymentStatus}
                </span>
              </div>

              {/* User & Plan Info */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-semibold text-lg">
                    {getUserInitial(subscription.user)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white truncate">
                    {getUserName(subscription.user)}
                  </h3>
                  <p className="text-sm text-SlateBlueText dark:text-darktext truncate">
                    {subscription.user?.email || "No Email"}
                  </p>
                  <div className="text-sm text-primary font-medium mt-1">
                    {getPlanName(subscription.plan)}
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                  <FileText className="w-4 h-4" />
                  <span className="font-mono">
                    {subscription.invoiceNumber}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                  <Calendar className="w-4 h-4" />
                  <span>Start: {formatDate(subscription.startDate)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                  <Calendar className="w-4 h-4" />
                  <span>End: {formatDate(subscription.endDate)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                  <Users className="w-4 h-4" />
                  <span>{subscription.studentCount} Students</span>
                </div>

                {/* السعر مع أيقونة العملة */}
                <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                  {getCurrencyIcon(subscription.currency)}
                  <span className="font-semibold text-MidnightNavyText dark:text-white">
                    {formatPrice(
                      subscription.totalAmount || 0,
                      subscription.currency
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                  <CreditCard className="w-4 h-4" />
                  <span>{subscription.paymentMethod}</span>
                </div>
              </div>

              {/* Notes (if any) */}
              {subscription.notes && (
                <div className="mb-4 p-3 bg-PaleCyan dark:bg-dark_input rounded-lg">
                  <p className="text-xs text-SlateBlueText dark:text-darktext">
                    {subscription.notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => showSubscriptionDetails(subscription)}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Eye className="w-3 h-3" />
                  View Details
                </button>

                <button
                  onClick={() => deleteSubscription(subscription._id)}
                  className="bg-SlateBlueText/10 hover:bg-SlateBlueText/20 dark:bg-darktext/20 dark:hover:bg-darktext/30 text-SlateBlueText dark:text-darktext py-2 px-3 rounded-lg font-semibold text-xs transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {subscriptions.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
            No subscriptions yet
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            When users subscribe to your plans, their subscriptions will appear
            here for management.
          </p>
        </div>
      )}

      {/* Subscription Details Modal */}
      {showDetails && selectedSubscription && (
        <SubscriptionsForm
          subscription={selectedSubscription}
          onClose={closeSubscriptionDetails}
        />
      )}
    </div>
  );
}