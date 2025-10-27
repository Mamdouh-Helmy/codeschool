"use client";
import React, { useState } from "react";
import toast from "react-hot-toast"; // استيراد toast
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
  X,
  Euro,
  Mail,
  Edit3,
  Save,
} from "lucide-react";
import EgyptianPoundIcon from "../../icons/EgyptianPoundIcon";
import { useI18n } from "@/i18n/I18nProvider";

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

interface Props {
  subscription: Subscription;
  onClose: () => void;
  onUpdate?: (updatedSubscription: Subscription) => void;
}

export default function SubscriptionsForm({ subscription, onClose, onUpdate }: Props) {
  const { t } = useI18n();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(subscription.notes || "");
  const [isSaving, setIsSaving] = useState(false);

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

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
      case "expired":
        return "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      case "expired":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const remainingDays = () => {
    const endDate = new Date(subscription.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getProgressPercentage = () => {
    const start = new Date(subscription.startDate).getTime();
    const end = new Date(subscription.endDate).getTime();
    const now = new Date().getTime();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end - start;
    const passed = now - start;
    return Math.round((passed / total) * 100);
  };

  const isSubscriptionActive = subscription.status === "active";
  const progressPercentage = getProgressPercentage();

  const handleSaveNotes = async () => {
    if (notes === subscription.notes) {
      setIsEditingNotes(false);
      toast.success(t("subscriptions.noChangesMade")); // إشعار عند عدم وجود تغييرات
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/subscriptions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscription._id,
          notes: notes,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIsEditingNotes(false);
          if (onUpdate) {
            onUpdate(result.data);
          }
          // إشعار نجاح الحفظ
          toast.success(t("subscriptions.notesUpdated"));
        }
      } else {
        throw new Error("Failed to update notes");
      }
    } catch (error) {
      console.error("Error updating notes:", error);
      // إشعار خطأ
      toast.error(t("subscriptions.notesUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setNotes(subscription.notes || "");
    setIsEditingNotes(false);
    // إشعار عند الإلغاء
    toast(t("common.changesCancelled"), {
      icon: '⚠️',
    });
  };

  const handleEditClick = () => {
    setIsEditingNotes(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t("subscriptions.subscriptionDetails")}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                  <FileText className="w-4 h-4" />
                  {t("subscriptions.invoiceNumber")}: {subscription.invoiceNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
            >
              <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Status Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Subscription Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {t("subscriptions.status")}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 ${getStatusColor(subscription.status)}`}>
                        {getStatusIcon(subscription.status)}
                        {t(`subscriptions.status.${subscription.status}`)}
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {t("subscriptions.paymentStatus")}
                    </p>
                    <div className="mt-2">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getPaymentStatusColor(subscription.paymentStatus)}`}>
                        {t(`subscriptions.paymentStatus.${subscription.paymentStatus}`)}
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              {/* Remaining Days */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {t("subscriptions.remainingDays")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {remainingDays()}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {t("dashboard.progress")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {progressPercentage}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {isSubscriptionActive && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>{t("dashboard.weeklyProgress")}</span>
                  <span>{progressPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span>{formatDate(subscription.startDate)}</span>
                  <span>{formatDate(subscription.endDate)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Information */}
              <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("subscriptions.userInfo")}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("subscriptions.userInfoDescription")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-semibold text-lg">
                        {subscription.user?.name?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {subscription.user?.name || t("subscriptions.unknownUser")}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        ID: {subscription.user?._id}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {subscription.user?.email || t("subscriptions.noEmail")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Information */}
              <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("subscriptions.planInfo")}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("subscriptions.planInfoDescription")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-3">
                      {subscription.plan?.name || t("subscriptions.unknownPlan")}
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCurrencyIcon(subscription.currency)}
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatPrice(subscription.totalAmount || 0, subscription.currency)}
                        </span>
                      </div>
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-semibold">
                        {subscription.plan?.duration || 30} {t("common.days")}
                      </span>
                    </div>
                  </div>

                  {subscription.plan?.features && subscription.plan.features.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                        {t("subscriptions.planFeatures")}:
                      </h5>
                      <div className="space-y-2">
                        {subscription.plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("subscriptions.subscriptionDetails")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("subscriptions.detailsFullDescription")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("subscriptions.invoiceNumber")}</p>
                      <p className="font-mono font-semibold text-gray-900 dark:text-white">{subscription.invoiceNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("common.startDate")}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{formatDate(subscription.startDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Users className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("common.students")}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{subscription.studentCount} {t("common.students")}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("subscriptions.paymentMethod")}</p>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">{subscription.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Calendar className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("common.endDate")}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{formatDate(subscription.endDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("common.createdAt")}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{formatDateTime(subscription.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("subscriptions.notes")}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("subscriptions.notesDescription")}
                    </p>
                  </div>
                </div>
                {!isEditingNotes && (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    {t("common.edit")}
                  </button>
                )}
              </div>

              <div className={`p-4 rounded-xl border ${
                isEditingNotes 
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800" 
                  : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
              }`}>
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t("subscriptions.addNotesPlaceholder")}
                      className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-all duration-200 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? t("common.saving") : t("common.save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-gray-700 dark:text-yellow-200 leading-relaxed ${
                    !notes ? "italic text-gray-500 dark:text-gray-400" : ""
                  }`}>
                    {notes || t("subscriptions.noNotes")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}