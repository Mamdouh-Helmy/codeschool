"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Crown,
  Zap,
  Star,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Globe,
  Users,
  Briefcase,
  CreditCard,
  Package,
  TrendingUp,
  CheckCircle,
  Lightbulb,
  Euro,
} from "lucide-react";
import Modal from "./Modal";
import PricingForm from "./PricingForm";
import EgyptianPoundIcon from "../../icons/EgyptianPoundIcon";
import { useI18n } from "@/i18n/I18nProvider";

interface PricingPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  maxStudents?: number;
  language: string;
  type: string;
  discount?: number;
  originalPrice?: number;
}

export default function PricingAdmin() {
  const { t } = useI18n();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PricingPlan | null>(null);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setPlans(json.data);
      }
    } catch (err) {
      console.error("Error loading pricing plans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const onSaved = async () => {
    await loadPlans();
  };

  const onEdit = (plan: PricingPlan) => {
    setEditing(plan);
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    toast(
      (tObj) => (
        <div className="w-404 max-w-full bg-white dark:bg-darkmode text-MidnightNavyText dark:text-white rounded-14 shadow-round-box border-none outline-none dark:border-dark_border p-4">
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-full bg-LightYellow text-primary font-bold"
              aria-hidden
            >
              !
            </div>

            <div className="flex-1">
              <p className="text-16 font-semibold">
                {t("pricing.deleteConfirm")}
              </p>
              <p className="text-14 mt-1 text-slate-500 dark:text-darktext">
                {t("pricing.deleteWarning")}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-3 py-1 bg-PaleCyan dark:bg-dark_input text-MidnightNavyText dark:text-white rounded-14 text-15 hover:opacity-90 border border-PeriwinkleBorder/50"
              onClick={() => toast.dismiss(tObj.id)}
            >
              {t("common.cancel")}
            </button>

            <button
              className="px-3 py-1 bg-primary text-white rounded-14 text-15 hover:bg-primary/90 shadow-sm"
              onClick={async () => {
                toast.dismiss(tObj.id);
                try {
                  const res = await fetch(
                    `/api/pricing?id=${encodeURIComponent(id)}`,
                    { method: "DELETE" }
                  );
                  if (res.ok) {
                    setPlans((prev) => prev.filter((p) => p._id !== id));
                    toast.success(t("pricing.deletedSuccess"));
                  } else {
                    toast.error(t("pricing.deleteFailed"));
                  }
                } catch (err) {
                  console.error("Error deleting plan:", err);
                  toast.error(t("pricing.deleteError"));
                }
              }}
            >
              {t("common.delete")}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-2">{t("pricing.loading")}</span>
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
              {t("pricing.management")}
            </h1>
            <p className="text-sm text-SlateBlueText dark:text-darktext max-w-2xl">
              {t("pricing.managementDescription")}
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="mt-4 lg:mt-0 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("pricing.addNew")}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t("pricing.totalPlans")}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {plans.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t("pricing.activePlans")}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {plans.filter((p) => p.isActive).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-ElectricAqua" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide">
                {t("pricing.popularPlans")}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {plans.filter((p) => p.isPopular).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-Aquamarine/10 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-Aquamarine" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkmode rounded-xl p-4 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-SlateBlueText dark:text-darktext uppercase tracking-wide flex items-center gap-1">
                {t("pricing.avgPrice")}
              </p>
              <p className="text-2xl font-bold text-MidnightNavyText dark:text-white mt-1">
                {plans.length > 0
                  ? Math.round(
                      plans.reduce((acc, p) => acc + p.price, 0) / plans.length
                    )
                  : 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-LightYellow/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-LightYellow" />
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`relative rounded-xl border p-6 transition-all duration-300 hover:shadow-md ${
              plan.isPopular
                ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
                : "border-PowderBlueBorder bg-white dark:bg-darkmode dark:border-dark_border"
            }`}
          >
            {/* Popular Badge */}
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-semibold shadow-md flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  {t("pricing.popularBadge")}
                </span>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-4 right-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                  plan.isActive
                    ? "bg-Aquamarine/20 text-Salem dark:bg-Aquamarine/30"
                    : "bg-SlateBlueText/20 text-SlateBlueText dark:bg-darktext/30"
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                {plan.isActive
                  ? t("common.status.active")
                  : t("common.status.inactive")}
              </span>
            </div>

            {/* Plan Header */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-2">
                {plan.name}
              </h3>
              <p className="text-sm text-SlateBlueText dark:text-darktext">
                {plan.description}
              </p>
            </div>

            {/* Pricing */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl flex gap-1 items-center font-bold text-MidnightNavyText dark:text-white">
                  {plan.currency === "USD" ? (
                    <DollarSign className="inline-block w-5 h-5" />
                  ) : plan.currency === "EUR" ? (
                    <Euro className="inline-block w-5 h-5" />
                  ) : (
                    <EgyptianPoundIcon size={15} />
                  )}
                  {plan.price}
                </span>
                <span className="text-sm text-SlateBlueText dark:text-darktext mt-1">
                  / {t(`pricing.billingPeriod.${plan.billingPeriod}`)}
                </span>
              </div>

              {plan.originalPrice && plan.discount && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm flex gap-1 items-center text-SlateBlueText dark:text-darktext line-through">
                    {plan.currency === "USD" ? (
                      <DollarSign className="inline-block w-5 h-5" />
                    ) : plan.currency === "EUR" ? (
                      <Euro className="inline-block w-5 h-5" />
                    ) : (
                      <EgyptianPoundIcon size={15} />
                    )}
                    {plan.originalPrice}
                  </span>
                  <span className="bg-Aquamarine/20 text-Salem px-2 py-1 rounded-full text-xs font-semibold">
                    {t("pricing.save")} {plan.discount}%
                  </span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-semibold text-MidnightNavyText dark:text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                {t("pricing.featuresIncluded")}
              </h4>
              <div className="space-y-2">
                {plan.features.slice(0, 6).map((feature, index) => (
                  <div
                    key={`feature-${plan._id}-${index}`}
                    className="flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></div>
                    <span className="text-sm text-SlateBlueText dark:text-darktext">
                      {feature}
                    </span>
                  </div>
                ))}
                {plan.features.length > 6 && (
                  <div className="text-xs text-SlateBlueText dark:text-darktext text-center pt-1">
                    {t("pricing.moreFeatures", {
                      count: plan.features.length - 6,
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Plan Details */}
            <div className="grid grid-cols-2 gap-3 text-xs text-SlateBlueText dark:text-darktext mb-6">
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3" />
                <span className="capitalize">
                  {t(`common.language.${plan.language}`)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3" />
                <span>{plan.maxStudents || t("pricing.unlimited")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-3 h-3" />
                <span className="capitalize">
                  {t(`pricing.type.${plan.type}`)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-3 h-3" />
                <span>{t(`pricing.currency.${plan.currency}`)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onEdit(plan)}
                  aria-label={t("common.edit")}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg font-semibold text-sm transition-transform transition-shadow duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center justify-center gap-2 group"
                >
                  <Edit className="w-3 h-3 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  {t("common.edit")}
                </button>

                <button
                  onClick={() => onDelete(plan._id)}
                  aria-label={t("common.delete")}
                  className="bg-SlateBlueText/10 hover:bg-SlateBlueText/20 dark:bg-darktext/20 dark:hover:bg-darktext/30 text-SlateBlueText dark:text-darktext py-2 px-3 rounded-lg font-semibold text-xs transition-transform transition-colors transition-shadow duration-300 hover:scale-105 active:scale-100 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-SlateBlueText/20 flex items-center justify-center gap-2 group"
                >
                  <Trash2 className="w-3 h-3 transition-transform duration-300 group-hover:rotate-12" />
                  {t("common.delete")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {plans.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-darkmode rounded-xl border border-PowderBlueBorder dark:border-dark_border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-MidnightNavyText dark:text-white mb-3">
            {t("pricing.noPlans")}
          </h3>
          <p className="text-sm text-SlateBlueText dark:text-darktext mb-6 max-w-md mx-auto">
            {t("pricing.createFirst")}
          </p>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            {t("pricing.createFirstButton")}
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={editing ? t("pricing.editPlan") : t("pricing.createPlan")}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      >
        <PricingForm
          initial={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSaved={onSaved}
        />
      </Modal>
    </div>
  );
}
