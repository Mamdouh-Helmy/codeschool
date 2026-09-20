// components/admin/StudentPackageModal.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Package, Plus, Minus, Pencil, RefreshCw, Trash2, Loader2, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";

// ⚠️ عدّل المسار ده لو route الباكدج عندك مختلف (اللي فيه POST/PATCH/DELETE بتاع credit package)
const packageUrl = (id) => `/api/students/${id}/credit-package`;
const adjustUrl = (id) => `/api/students/${id}/credit-hours/adjust`;
const PLANS_URL = "/api/package-plans";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-dark_border " +
  "bg-gray-50 dark:bg-dark_input text-gray-800 dark:text-gray-100 " +
  "focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition";

const toDateInput = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-500 dark:text-darkmuted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

export default function StudentPackageModal({ student, isRTL, onClose, onChanged }) {
  const tx = (ar, en) => (isRTL ? ar : en);
  const credit = student.credit;

  const [tab, setTab] = useState(credit.hasPackage ? "adjust" : "new");
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);

  // adjust
  const [direction, setDirection] = useState("add");
  const [hours, setHours] = useState("");
  const [adjReason, setAdjReason] = useState("");

  // edit
  const [edit, setEdit] = useState({
    packagePlanId: credit.packagePlanId || "",
    totalHours: credit.totalHours,
    price: credit.price,
    startDate: toDateInput(credit.startDate),
    endDate: toDateInput(credit.endDate),
    reason: "",
  });

  // new package
  const [nw, setNw] = useState({
    packagePlanId: "",
    price: "",
    startDate: toDateInput(new Date()),
    paymentOption: "full",
    amountPaid: "",
    dueDate: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(PLANS_URL, { cache: "no-store" });
        const json = await res.json();
        if (json.success) setPlans((json.data || []).filter((p) => p.isActive !== false));
      } catch (e) {
        console.error("plans load failed", e);
      }
    })();
  }, []);

  const selectedNewPlan = useMemo(
    () => plans.find((p) => String(p._id || p.id) === nw.packagePlanId),
    [plans, nw.packagePlanId],
  );

  const pct = credit.totalHours > 0 ? Math.min(100, (credit.remainingHours / credit.totalHours) * 100) : 0;
  const barCls = credit.remainingHours <= 2 ? "bg-red-500" : credit.remainingHours <= 5 ? "bg-amber-brand" : "bg-secondary dark:bg-emerald-400";

  async function call(url, method, body, okMsg) {
    setBusy(true);
    const tid = toast.loading(tx("جاري التنفيذ...", "Working..."));
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(okMsg, { id: tid });
        await onChanged();
        return true;
      }
      toast.error(json.message || json.error || tx("حصل خطأ", "Something went wrong"), { id: tid });
      return false;
    } catch {
      toast.error(tx("فشل الاتصال", "Network error"), { id: tid });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const submitAdjust = async () => {
    const h = Number(hours);
    if (!h || h <= 0) return toast.error(tx("اكتب عدد ساعات صحيح", "Enter valid hours"));
    const ok = await call(
      adjustUrl(student.id),
      "POST",
      { direction, hours: h, reason: adjReason },
      direction === "add" ? tx("تمت إضافة الساعات", "Hours added") : tx("تم خصم الساعات", "Hours deducted"),
    );
    if (ok) { setHours(""); setAdjReason(""); }
  };

  const submitEdit = async () => {
    const body = { reason: edit.reason };
    if (edit.packagePlanId && edit.packagePlanId !== (credit.packagePlanId || "")) body.packagePlanId = edit.packagePlanId;
    if (Number(edit.totalHours) !== credit.totalHours) body.totalHours = Number(edit.totalHours);
    if (Number(edit.price) !== credit.price) body.price = Number(edit.price);
    if (edit.startDate && edit.startDate !== toDateInput(credit.startDate)) body.startDate = edit.startDate;
    if (edit.endDate && edit.endDate !== toDateInput(credit.endDate)) body.endDate = edit.endDate;
    if (Object.keys(body).length === 1) return toast(tx("مفيش تغييرات", "No changes"));
    await call(packageUrl(student.id), "PATCH", body, tx("تم تعديل الباقة", "Package updated"));
  };

  const submitNew = async () => {
    if (!nw.packagePlanId) return toast.error(tx("اختار الباقة", "Select a plan"));
    if (nw.paymentOption === "partial" && !Number(nw.amountPaid)) return toast.error(tx("اكتب المبلغ المدفوع", "Enter paid amount"));
    if (nw.paymentOption !== "full" && !nw.dueDate) return toast.error(tx("حدد تاريخ الاستحقاق", "Set a due date"));
    const body = {
      packagePlanId: nw.packagePlanId,
      startDate: nw.startDate || undefined,
      paymentOption: nw.paymentOption,
      amountPaid: nw.paymentOption === "partial" ? Number(nw.amountPaid) : 0,
      dueDate: nw.paymentOption === "full" ? undefined : nw.dueDate,
    };
    if (nw.price !== "") body.price = Number(nw.price);
    const ok = await call(packageUrl(student.id), "POST", body, tx("تمت إضافة الباقة والفاتورة", "Package & invoice created"));
    if (ok) setTab("adjust");
  };

  const deletePackage = async () => {
    if (!confirm(tx(`حذف باقة ${student.name}؟ هتتنقل للأرشيف (الفاتورة مش هتتلغي).`, `Delete ${student.name}'s package? It moves to history (invoice is untouched).`))) return;
    const ok = await call(packageUrl(student.id), "DELETE", null, tx("تم حذف الباقة", "Package deleted"));
    if (ok) onClose();
  };

  const tabs = [
    ...(credit.hasPackage
      ? [
          { k: "adjust", icon: Plus, label: tx("الرصيد", "Balance") },
          { k: "edit", icon: Pencil, label: tx("تعديل", "Edit") },
        ]
      : []),
    { k: "new", icon: RefreshCw, label: credit.hasPackage ? tx("تجديد / باقة جديدة", "Renew / New") : tx("إضافة باقة", "Add package") },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-darkmode/60 backdrop-blur-sm p-3"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-darklight border border-gray-100 dark:border-dark_border shadow-2xl"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-dark_border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Package size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-gray-900 dark:text-white truncate">{student.name}</h3>
              <p className="text-xs text-gray-400">{tx("إدارة باقة الساعات", "Credit package management")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-dark_input transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* summary */}
          {credit.hasPackage ? (
            <div className="rounded-2xl bg-gray-50 dark:bg-dark_input/60 p-4 border border-gray-100 dark:border-dark_border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{credit.packageName || "—"}</span>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${credit.isExpired ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>
                  {credit.isExpired ? tx("منتهية", "Expired") : tx("نشطة", "Active")}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-200 dark:bg-dark_border overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${barCls}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex flex-wrap justify-between gap-2 mt-2.5 text-xs text-gray-500 dark:text-darkmuted">
                <span>
                  {tx("متبقي", "Remaining")} <b className="text-gray-800 dark:text-white">{credit.remainingHours}</b> / {credit.totalHours} {tx("ساعة", "h")}
                </span>
                <span>{tx("مستخدم", "Used")}: <b className="text-gray-800 dark:text-white">{credit.usedHours}</b></span>
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} />
                  {credit.startDate ? new Date(credit.startDate).toLocaleDateString(isRTL ? "ar-EG" : "en-GB") : "—"} →{" "}
                  {credit.endDate ? new Date(credit.endDate).toLocaleDateString(isRTL ? "ar-EG" : "en-GB") : "—"}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-dark_border p-4 text-center text-sm text-gray-400">
              {tx("الطالب ده معندوش باقة حالية", "This student has no active package")}
            </div>
          )}

          {/* tabs */}
          <div className="flex gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-dark_input">
            {tabs.map(({ k, icon: I, label }) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                  tab === k
                    ? "bg-white dark:bg-darklight text-primary shadow-sm"
                    : "text-gray-500 dark:text-darkmuted hover:text-gray-800 dark:hover:text-white"
                }`}
              >
                <I size={13} /> {label}
              </button>
            ))}
          </div>

          {/* ADJUST */}
          {tab === "adjust" && credit.hasPackage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: "add", icon: Plus, label: tx("إضافة ساعات", "Add hours"), on: "bg-emerald-500 text-white" },
                  { k: "subtract", icon: Minus, label: tx("خصم ساعات", "Deduct hours"), on: "bg-red-500 text-white" },
                ].map(({ k, icon: I, label, on }) => (
                  <button
                    key={k}
                    onClick={() => setDirection(k)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${
                      direction === k ? on : "bg-gray-100 dark:bg-dark_input text-gray-500"
                    }`}
                  >
                    <I size={15} /> {label}
                  </button>
                ))}
              </div>
              <Field label={tx("عدد الساعات", "Hours")}>
                <input type="number" min="0" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} className={inputCls} placeholder="1.5" />
              </Field>
              <Field label={tx("السبب (اختياري)", "Reason (optional)")}>
                <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} className={inputCls} />
              </Field>
              <button disabled={busy} onClick={submitAdjust} className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition">
                {busy && <Loader2 size={15} className="animate-spin" />} {tx("تنفيذ", "Apply")}
              </button>
            </div>
          )}

          {/* EDIT */}
          {tab === "edit" && credit.hasPackage && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                {tx(
                  "ده تصحيح لبيانات الباقة الحالية (مش تجديد). مش بيعمل فاتورة جديدة ومش بيلمس الفاتورة الحالية.",
                  "Corrects the current package (not a renewal). No new invoice; the existing one is untouched.",
                )}
              </p>
              <Field label={tx("نوع الباقة", "Plan")}>
                <select value={edit.packagePlanId} onChange={(e) => setEdit({ ...edit, packagePlanId: e.target.value })} className={inputCls}>
                  <option value="">{credit.packageName || "—"}</option>
                  {plans.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} — {p.totalHours}h / {p.months}m
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tx("إجمالي الساعات", "Total hours")} hint={tx("مينفعش يقل عن المستخدم", "Can't go below used")}>
                  <input type="number" min="0" step="0.25" value={edit.totalHours} onChange={(e) => setEdit({ ...edit, totalHours: e.target.value })} className={inputCls} />
                </Field>
                <Field label={tx("السعر", "Price")}>
                  <input type="number" min="0" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} className={inputCls} />
                </Field>
                <Field label={tx("تاريخ البداية", "Start")}>
                  <input type="date" value={edit.startDate} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} className={inputCls} />
                </Field>
                <Field label={tx("تاريخ الانتهاء", "End")}>
                  <input type="date" value={edit.endDate} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label={tx("سبب التعديل", "Reason")}>
                <input value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} className={inputCls} />
              </Field>
              <button disabled={busy} onClick={submitEdit} className="w-full py-3 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition">
                {busy && <Loader2 size={15} className="animate-spin" />} {tx("حفظ التعديلات", "Save changes")}
              </button>
            </div>
          )}

          {/* NEW */}
          {tab === "new" && (
            <div className="space-y-4">
              {credit.hasPackage && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded-xl px-3 py-2">
                  {tx("الباقة الحالية هتتنقل للأرشيف وتتحل محلها الجديدة.", "Current package will move to history and be replaced.")}
                </p>
              )}
              <Field label={tx("الباقة", "Plan")}>
                <select
                  value={nw.packagePlanId}
                  onChange={(e) => {
                    const p = plans.find((x) => String(x._id || x.id) === e.target.value);
                    setNw({ ...nw, packagePlanId: e.target.value, price: p ? p.price : "" });
                  }}
                  className={inputCls}
                >
                  <option value="">{tx("اختار...", "Select...")}</option>
                  {plans.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name} — {p.totalHours}h / {p.months}m
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={tx("السعر", "Price")} hint={selectedNewPlan ? `${tx("الافتراضي", "Default")}: ${selectedNewPlan.price}` : ""}>
                  <input type="number" min="0" value={nw.price} onChange={(e) => setNw({ ...nw, price: e.target.value })} className={inputCls} />
                </Field>
                <Field label={tx("تاريخ البداية", "Start")}>
                  <input type="date" value={nw.startDate} onChange={(e) => setNw({ ...nw, startDate: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label={tx("الدفع", "Payment")}>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["full", tx("كامل", "Full")],
                    ["partial", tx("جزئي", "Partial")],
                    ["none", tx("لسه", "Unpaid")],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setNw({ ...nw, paymentOption: k })}
                      className={`py-2 rounded-xl text-xs font-bold transition ${
                        nw.paymentOption === k ? "bg-primary text-white" : "bg-gray-100 dark:bg-dark_input text-gray-500"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              {nw.paymentOption === "partial" && (
                <Field label={tx("المبلغ المدفوع", "Amount paid")}>
                  <input type="number" min="0" value={nw.amountPaid} onChange={(e) => setNw({ ...nw, amountPaid: e.target.value })} className={inputCls} />
                </Field>
              )}
              {nw.paymentOption !== "full" && (
                <Field label={tx("تاريخ الاستحقاق", "Due date")}>
                  <input type="date" value={nw.dueDate} onChange={(e) => setNw({ ...nw, dueDate: e.target.value })} className={inputCls} />
                </Field>
              )}
              <button disabled={busy} onClick={submitNew} className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition">
                {busy && <Loader2 size={15} className="animate-spin" />} {tx("إنشاء الباقة والفاتورة", "Create package & invoice")}
              </button>
            </div>
          )}

          {/* danger zone */}
          {credit.hasPackage && (
            <button
              disabled={busy}
              onClick={deletePackage}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/10 transition disabled:opacity-50"
            >
              <Trash2 size={14} /> {tx("حذف الباقة الحالية", "Delete current package")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}