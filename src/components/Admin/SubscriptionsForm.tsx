"use client";
import React from "react";
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
  Package,
  Mail,
  Phone,
  MapPin,
  Globe,
  Edit,
  Download,
  Send,
  Euro,
} from "lucide-react";
import EgyptianPoundIcon from "../../icons/EgyptianPoundIcon";

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

interface SubscriptionDetailsProps {
  subscription: Subscription;
  onClose: () => void;
  onEdit?: (subscription: Subscription) => void;
}

export default function SubscriptionsForm({ 
  subscription, 
  onClose, 
  onEdit 
}: SubscriptionDetailsProps) {
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

  // دالة لتنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // دالة لتنسيق التاريخ والوقت
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // دالة للحصول على لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-Aquamarine/20 text-Salem border-Aquamarine/30";
      case "pending":
        return "bg-LightYellow/20 text-amber-700 border-LightYellow/30";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      case "expired":
        return "bg-SlateBlueText/20 text-SlateBlueText border-SlateBlueText/30";
      default:
        return "bg-gray-200 text-gray-700 border-gray-300";
    }
  };

  // دالة للحصول على أيقونة الحالة
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      case "expired":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // حساب الأيام المتبقية
  const getDaysRemaining = () => {
    const endDate = new Date(subscription.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-darkmode rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-darkmode border-b border-PowderBlueBorder dark:border-dark_border p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-MidnightNavyText dark:text-white">
                  Subscription Details
                </h2>
                <p className="text-sm text-SlateBlueText dark:text-darktext">
                  Invoice: {subscription.invoiceNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(subscription)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-sm transition-all duration-300"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-SlateBlueText/10 hover:bg-SlateBlueText/20 dark:bg-darktext/20 dark:hover:bg-darktext/30 text-SlateBlueText dark:text-darktext rounded-lg transition-all duration-300"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border-2 ${getStatusColor(subscription.status)}`}>
              <div className="flex items-center gap-3">
                {getStatusIcon(subscription.status)}
                <div>
                  <p className="text-sm font-medium">Subscription Status</p>
                  <p className="text-lg font-bold capitalize">{subscription.status}</p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg border-2 ${
              subscription.paymentStatus === "paid" 
                ? "bg-Aquamarine/20 text-Salem border-Aquamarine/30"
                : subscription.paymentStatus === "pending"
                ? "bg-LightYellow/20 text-amber-700 border-LightYellow/30"
                : "bg-red-100 text-red-700 border-red-200"
            }`}>
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium">Payment Status</p>
                  <p className="text-lg font-bold capitalize">{subscription.paymentStatus}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border-2 border-PowderBlueBorder dark:border-dark_border bg-PaleCyan dark:bg-dark_input">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Days Remaining</p>
                  <p className="text-lg font-bold text-MidnightNavyText dark:text-white">
                    {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Information */}
            <div className="space-y-4">
              <div className="bg-PaleCyan dark:bg-dark_input rounded-lg p-4">
                <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  User Information
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold text-lg">
                        {subscription.user?.name?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-MidnightNavyText dark:text-white">
                        {subscription.user?.name || "Unknown User"}
                      </p>
                      <p className="text-sm text-SlateBlueText dark:text-darktext">
                        User ID: {subscription.user?._id || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-SlateBlueText" />
                      <span className="text-SlateBlueText dark:text-darktext">
                        {subscription.user?.email || "No email provided"}
                      </span>
                    </div>
                    
                    {subscription.user?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-SlateBlueText" />
                        <span className="text-SlateBlueText dark:text-darktext">
                          {subscription.user.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Plan Information */}
              <div className="bg-PaleCyan dark:bg-dark_input rounded-lg p-4">
                <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Plan Details
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-MidnightNavyText dark:text-white text-lg">
                      {subscription.plan?.name || "Unknown Plan"}
                    </p>
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                      Plan ID: {subscription.plan?._id || "N/A"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-lg font-bold text-MidnightNavyText dark:text-white">
                    {getCurrencyIcon(subscription.currency)}
                    <span>
                      {formatPrice(
                        subscription.totalAmount || 0,
                        subscription.currency
                      )}
                    </span>
                  </div>

                  {subscription.plan?.duration && (
                    <div className="text-sm text-SlateBlueText dark:text-darktext">
                      Duration: {subscription.plan.duration} days
                    </div>
                  )}

                  {subscription.plan?.features && subscription.plan.features.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-MidnightNavyText dark:text-white mb-2">
                        Features:
                      </p>
                      <ul className="space-y-1">
                        {subscription.plan.features.slice(0, 5).map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-SlateBlueText dark:text-darktext">
                            <CheckCircle className="w-3 h-3 text-Aquamarine" />
                            {feature}
                          </li>
                        ))}
                        {subscription.plan.features.length > 5 && (
                          <li className="text-sm text-SlateBlueText dark:text-darktext">
                            +{subscription.plan.features.length - 5} more features
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="space-y-4">
              {/* Timeline */}
              <div className="bg-PaleCyan dark:bg-dark_input rounded-lg p-4">
                <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Subscription Timeline
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-MidnightNavyText dark:text-white">Start Date</p>
                      <p className="text-sm text-SlateBlueText dark:text-darktext">
                        {formatDate(subscription.startDate)}
                      </p>
                    </div>
                    <div className="w-3 h-3 bg-Aquamarine rounded-full"></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-MidnightNavyText dark:text-white">End Date</p>
                      <p className="text-sm text-SlateBlueText dark:text-darktext">
                        {formatDate(subscription.endDate)}
                      </p>
                    </div>
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                  </div>

                  <div className="h-1 bg-PowderBlueBorder dark:bg-dark_border rounded-full relative">
                    <div 
                      className="h-1 bg-gradient-to-r from-Aquamarine to-primary rounded-full absolute top-0 left-0"
                      style={{
                        width: `${Math.max(0, Math.min(100, 100 - (daysRemaining / (subscription.plan?.duration || 30)) * 100))}%`
                      }}
                    ></div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                      {daysRemaining > 0 
                        ? `${daysRemaining} days remaining` 
                        : "Subscription expired"
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment & Students */}
              <div className="bg-PaleCyan dark:bg-dark_input rounded-lg p-4">
                <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-4">
                  Additional Information
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                        Payment Method
                      </p>
                      <p className="text-sm text-SlateBlueText dark:text-darktext capitalize">
                        {subscription.paymentMethod}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                        Student Count
                      </p>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-SlateBlueText" />
                        <span className="text-sm text-SlateBlueText dark:text-darktext">
                          {subscription.studentCount} students
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                      Created At
                    </p>
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                      {formatDateTime(subscription.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-MidnightNavyText dark:text-white">
                      Last Updated
                    </p>
                    <p className="text-sm text-SlateBlueText dark:text-darktext">
                      {formatDateTime(subscription.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {subscription.notes && (
                <div className="bg-PaleCyan dark:bg-dark_input rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-MidnightNavyText dark:text-white mb-2">
                    Notes
                  </h3>
                  <p className="text-sm text-SlateBlueText dark:text-darktext">
                    {subscription.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
            <button className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download Invoice
            </button>
            <button className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2">
              <Send className="w-4 h-4" />
              Send Reminder
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}