"use client";
import { useState, useEffect } from "react";
import {
  Tag,
  FileText,
  DollarSign,
  CheckCircle,
  Globe,
  Calendar,
  Settings,
  Users,
  Zap,
  List,
  Lightbulb,
  X,
  Save,
  Rocket,
  Crown,
  BadgePercent,
  CircleDollarSign,
  Languages,
  Package,
  UserCheck,
  Wrench,
  Euro,
  PoundSterling,
} from "lucide-react";
import EgyptianPoundIcon from "../../icons/EgyptianPoundIcon";
import { useI18n } from "@/i18n/I18nProvider";
import toast from "react-hot-toast";

interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function PricingForm({ initial, onClose, onSaved }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    description: initial?.description || "",
    price: initial?.price || 0,
    currency: initial?.currency || "USD",
    billingPeriod: initial?.billingPeriod || "monthly",
    features: initial?.features || [],
    isPopular: initial?.isPopular || false,
    isActive: initial?.isActive ?? true,
    maxStudents: initial?.maxStudents || 0,
    language: initial?.language || "en",
    type: initial?.type || "standard",
    discount: initial?.discount || 0,
    originalPrice: initial?.originalPrice || 0,
  }));

  const [featuresInput, setFeaturesInput] = useState(
    initial?.features?.join("\n") || ""
  );
  const [loading, setLoading] = useState(false);

  const safeParseNumber = (value: string | number): number => {
    if (value === "" || value === null || value === undefined) return 0;
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  };

  const calculateFinalPrice = (original: number, discount: number): number => {
    if (original > 0 && discount > 0) {
      const discountAmount = (original * discount) / 100;
      return Math.max(0, original - discountAmount);
    }
    return original;
  };

  const calculateDiscountPercentage = (
    original: number,
    final: number
  ): number => {
    if (original > 0 && final > 0 && original > final) {
      return Math.round(((original - final) / original) * 100);
    }
    return 0;
  };

  const getCurrencyInfo = (currency: string) => {
    switch (currency) {
      case "USD":
        return { icon: <DollarSign className="w-3 h-3" />, symbol: "$" };
      case "EUR":
        return { icon: <Euro className="w-3 h-3" />, symbol: "€" };
      case "EGP":
        return { icon: <EgyptianPoundIcon size={15} />, symbol: "E£" };
      default:
        return { icon: <DollarSign className="w-3 h-3" />, symbol: "$" };
    }
  };

  const currencyInfo = getCurrencyInfo(form.currency);

  useEffect(() => {
    const original = safeParseNumber(form.originalPrice);
    const discount = safeParseNumber(form.discount);
    const price = safeParseNumber(form.price);

    if (original > 0 && discount === 0 && price === 0) {
      setForm((prev) => ({
        ...prev,
        price: original,
      }));
    }

    if (original > 0 && discount > 0) {
      const finalPrice = calculateFinalPrice(original, discount);
      setForm((prev) => ({
        ...prev,
        price: Number(finalPrice.toFixed(2)),
      }));
    }
  }, [form.originalPrice, form.discount]);

  const onChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePriceChange = (field: string, value: string | number) => {
    const numValue = safeParseNumber(value);

    if (field === "originalPrice") {
      const original = numValue;
      const discount = safeParseNumber(form.discount);

      if (original > 0) {
        if (discount > 0) {
          const finalPrice = calculateFinalPrice(original, discount);
          setForm((prev) => ({
            ...prev,
            originalPrice: original,
            price: Number(finalPrice.toFixed(2)),
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            originalPrice: original,
            price: original,
          }));
        }
      } else {
        setForm((prev) => ({
          ...prev,
          originalPrice: original,
          price: 0,
        }));
      }
    } else if (field === "discount") {
      const discount = numValue;
      const original = safeParseNumber(form.originalPrice);

      if (original > 0) {
        if (discount > 0) {
          const finalPrice = calculateFinalPrice(original, discount);
          setForm((prev) => ({
            ...prev,
            discount: discount,
            price: Number(finalPrice.toFixed(2)),
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            discount: 0,
            price: original,
          }));
        }
      } else {
        setForm((prev) => ({
          ...prev,
          discount: discount,
        }));
      }
    } else if (field === "price") {
      const finalPrice = numValue;
      const original = safeParseNumber(form.originalPrice);

      if (original > 0 && finalPrice > 0) {
        if (finalPrice < original) {
          const discountPercentage = calculateDiscountPercentage(
            original,
            finalPrice
          );
          setForm((prev) => ({
            ...prev,
            price: finalPrice,
            discount: discountPercentage,
          }));
        } else if (finalPrice >= original) {
          setForm((prev) => ({
            ...prev,
            price: finalPrice,
            discount: 0,
          }));
        }
      } else {
        setForm((prev) => ({
          ...prev,
          price: finalPrice,
        }));
      }
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const features = featuresInput
        .split("\n")
        .map((feature) => feature.trim())
        .filter((feature) => feature.length > 0);

      const payload = {
        ...form,
        features,
        price: safeParseNumber(form.price),
        maxStudents: safeParseNumber(form.maxStudents),
        discount: safeParseNumber(form.discount),
        originalPrice: safeParseNumber(form.originalPrice),
      };

      const method = initial?._id ? "PUT" : "POST";
      const url = "/api/pricing";

      console.log("Sending payload:", payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          initial?._id ? { id: initial._id, ...payload } : payload
        ),
      });

      if (res.ok) {
        onSaved();
        onClose();
        toast.success(t("pricing.savedSuccess"));
      } else {
        const errorData = await res.json();
        console.error("Failed to save pricing plan:", errorData);
        toast.error(t("pricing.saveError", { message: errorData.message }));
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error(t("pricing.saveError", { message: t("common.error") }));
    } finally {
      setLoading(false);
    }
  };

  const showDiscountInfo =
    form.originalPrice > 0 && form.discount > 0 && form.price > 0;

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Tag className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("pricing.basicInfo")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("pricing.basicInfoDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Tag className="w-3 h-3 text-primary" />
              {t("pricing.planName")} *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder={t("pricing.planNamePlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <FileText className="w-3 h-3 text-primary" />
              {t("common.description")} *
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder={t("pricing.descriptionPlaceholder")}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder outline-none dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
              required
            />
          </div>
        </div>
      </div>

      {/* Pricing & Billing */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-Aquamarine/10 text-Aquamarine rounded-lg flex items-center justify-center">
            {currencyInfo.icon}
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("pricing.pricingBilling")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("pricing.pricingBillingDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <span className="text-Aquamarine">{currencyInfo.icon}</span>
              {t("pricing.originalPrice")} *
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.originalPrice || ""}
                onChange={(e) => handlePriceChange("originalPrice", e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 pl-8 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
                required
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-13 text-SlateBlueText dark:text-darktext">
                {currencyInfo.icon}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <BadgePercent className="w-3 h-3 text-Aquamarine" />
              {t("pricing.discount")} (%)
            </label>
            <input
              type="number"
              value={form.discount || ""}
              onChange={(e) => handlePriceChange("discount", e.target.value)}
              placeholder="0"
              min="0"
              max="100"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-Aquamarine" />
              {t("pricing.finalPrice")} *
            </label>
            <div className="relative">
              <input
                type="number"
                value={form.price || ""}
                onChange={(e) => handlePriceChange("price", e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`w-full px-3 py-2.5 pl-8 border border-PowderBlueBorder outline-none dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 ${
                  form.originalPrice > 0 && form.discount > 0
                    ? "bg-gray-50 dark:bg-dark_input/50"
                    : ""
                }`}
                required
                readOnly={form.originalPrice > 0 && form.discount > 0}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-13 text-SlateBlueText dark:text-darktext">
                {currencyInfo.icon}
              </div>
            </div>
            {form.originalPrice > 0 && form.discount > 0 && (
              <p className="text-11 text-Aquamarine dark:text-Aquamarine mt-1 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                {t("pricing.calculatedAutomatically")}
              </p>
            )}
            {form.originalPrice > 0 && form.discount === 0 && (
              <p className="text-11 text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-2.5 h-2.5" />
                {t("pricing.sameAsOriginal")}
              </p>
            )}
          </div>
        </div>

        {showDiscountInfo && (
          <div className="bg-gradient-to-r from-Aquamarine/10 to-primary/10 border border-Aquamarine/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-Aquamarine/20 rounded flex items-center justify-center">
                  <BadgePercent className="w-3 h-3 text-Aquamarine" />
                </div>
                <div>
                  <p className="text-13 font-medium text-MidnightNavyText dark:text-white">
                    {t("pricing.discountApplied")}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-13 flex gap-2 items-center text-SlateBlueText dark:text-darktext line-through">
                      {currencyInfo.icon}
                      {form.originalPrice}
                    </span>
                    <span className="text-13 font-bold text-Aquamarine dark:text-Aquamarine">
                      -{form.discount}%
                    </span>
                    <span className="text-14 flex gap-2 items-center font-bold text-MidnightNavyText dark:text-white">
                      = {currencyInfo.icon}
                      {form.price}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-Aquamarine/20 items-center flex gap-2 text-Aquamarine px-2 py-1 rounded-full text-12 font-semibold">
                {t("pricing.save")} {currencyInfo.icon}
                {(form.originalPrice - form.price).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Globe className="w-3 h-3 text-Aquamarine" />
              {t("common.currency")}
            </label>
            <div className="relative">
              <select
                value={form.currency}
                onChange={(e) => onChange("currency", e.target.value)}
                className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200 appearance-none pr-10"
              >
                <option value="USD">{t("pricing.currency.USD")}</option>
                <option value="EUR">{t("pricing.currency.EUR")}</option>
                <option value="EGP">{t("pricing.currency.EGP")}</option>
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                {currencyInfo.icon}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Calendar className="w-3 h-3 text-Aquamarine" />
              {t("pricing.billingPeriod")}
            </label>
            <select
              value={form.billingPeriod}
              onChange={(e) => onChange("billingPeriod", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            >
              <option value="monthly">{t("pricing.billingPeriod.monthly")}</option>
              <option value="quarterly">{t("pricing.billingPeriod.quarterly")}</option>
              <option value="yearly">{t("pricing.billingPeriod.yearly")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plan Configuration */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ElectricAqua/10 rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-ElectricAqua" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("pricing.planConfig")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("pricing.planConfigDescription")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Languages className="w-3 h-3 text-ElectricAqua" />
              {t("common.language")}
            </label>
            <select
              value={form.language}
              onChange={(e) => onChange("language", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            >
              <option value="en">{t("common.language.en")}</option>
              <option value="ar">{t("common.language.ar")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Package className="w-3 h-3 text-ElectricAqua" />
              {t("pricing.planType")}
            </label>
            <select
              value={form.type}
              onChange={(e) => onChange("type", e.target.value)}
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            >
              <option value="standard">{t("pricing.type.standard")}</option>
              <option value="premium">{t("pricing.type.premium")}</option>
              <option value="enterprise">{t("pricing.type.enterprise")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
              <Users className="w-3 h-3 text-ElectricAqua" />
              {t("pricing.maxStudents")}
            </label>
            <input
              type="number"
              value={form.maxStudents || ""}
              onChange={(e) =>
                onChange("maxStudents", safeParseNumber(e.target.value))
              }
              placeholder={t("pricing.maxStudentsPlaceholder")}
              min="0"
              className="w-full px-3 py-2.5 border border-PowderBlueBorder dark:border-dark_border outline-none rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-LightYellow/10 rounded-lg flex items-center justify-center">
            <List className="w-4 h-4 text-LightYellow" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("pricing.features")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("pricing.featuresDescription")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-13 font-medium text-MidnightNavyText dark:text-white flex items-center gap-2">
            <List className="w-3 h-3 text-LightYellow" />
            {t("pricing.featuresLabel")} ({t("pricing.featuresHint")})
          </label>
          <textarea
            value={featuresInput}
            onChange={(e) => setFeaturesInput(e.target.value)}
            rows={4}
            placeholder={t("pricing.featuresPlaceholder")}
            className="w-full px-3 py-2.5 border outline-none border-PowderBlueBorder dark:border-dark_border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark_input dark:text-white text-13 resize-none transition-all duration-200"
          />
          <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 flex items-center gap-1">
            <Lightbulb className="w-2.5 h-2.5" />
            {t("pricing.featuresHint")}
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4 bg-white dark:bg-darkmode rounded-xl p-5 border border-PowderBlueBorder dark:border-dark_border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-15 font-semibold text-MidnightNavyText dark:text-white">
              {t("pricing.settings")}
            </h3>
            <p className="text-12 text-SlateBlueText dark:text-darktext">
              {t("pricing.settingsDescription")}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Crown className="w-3 h-3 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isPopular}
                  onChange={(e) => onChange("isPopular", e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary border-PowderBlueBorder rounded"
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  {t("pricing.markPopular")}
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                {t("pricing.markPopularDescription")}
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3 p-3 border border-PowderBlueBorder dark:border-dark_border rounded-lg hover:bg-IcyBreeze dark:hover:bg-dark_input transition-all duration-200 cursor-pointer group">
            <div className="w-8 h-8 bg-Aquamarine/10 rounded flex items-center justify-center group-hover:bg-Aquamarine/20 transition-colors">
              <UserCheck className="w-3 h-3 text-Aquamarine" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => onChange("isActive", e.target.checked)}
                  className="w-4 h-4 text-Aquamarine focus:ring-Aquamarine border-PowderBlueBorder rounded"
                />
                <span className="text-13 font-medium text-MidnightNavyText dark:text-white">
                  {t("pricing.activePlan")}
                </span>
              </div>
              <p className="text-11 text-SlateBlueText dark:text-darktext mt-1 ml-6">
                {t("pricing.activePlanDescription")}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-PowderBlueBorder dark:border-dark_border">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-white dark:bg-dark_input border border-PowderBlueBorder dark:border-dark_border text-MidnightNavyText dark:text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 hover:bg-IcyBreeze dark:hover:bg-darklight hover:shadow-md flex items-center justify-center gap-2"
        >
          <X className="w-3 h-3" />
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-semibold text-13 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t("common.saving")}
            </>
          ) : initial ? (
            <>
              <Save className="w-3 h-3" />
              {t("pricing.updatePlan")}
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              {t("pricing.createPlan")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}