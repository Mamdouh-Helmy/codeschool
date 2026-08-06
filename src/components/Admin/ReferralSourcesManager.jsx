"use client";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Plus, Edit, Trash2, Check, X, ChevronUp, ChevronDown,
  Loader2, GitBranch, Eye, EyeOff, Hash, Search,
} from "lucide-react";

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-dark_border " +
  "bg-gray-50 dark:bg-dark_input text-gray-900 dark:text-white outline-none " +
  "focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all";

// توليد value تلقائي (slug) من label — بيسيب أي عربي زي ما هو، بيشيل بس الرموز والمسافات الزيادة
const slugify = (str) =>
  str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export default function ReferralSourcesManager() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState("");

  // إضافة
  const [newLabel, setNewLabel]     = useState("");
  const [newValue, setNewValue]     = useState("");
  const [valueTouched, setValueTouched] = useState(false);

  // تعديل
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/referral-sources");
      const data = await res.json();
      if (data.success) setSources(data.sources || []);
      else toast.error(data.message || "فشل تحميل المصادر");
    } catch {
      toast.error("فشل تحميل المصادر");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newValue.trim()) {
      toast.error("لازم تكتب الاسم والقيمة");
      return;
    }
    setSaving(true);
    try {
      const nextOrder = sources.length > 0 ? Math.max(...sources.map(s => s.order || 0)) + 1 : 0;
      const res  = await fetch("/api/admin/referral-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel, value: newValue, order: nextOrder, isActive: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "فشل الإضافة");

      setSources(prev => [...prev, data.source]);
      setNewLabel(""); setNewValue(""); setValueTouched(false);
      toast.success("تمت إضافة المصدر");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const patchSource = async (id, updates) => {
    const res  = await fetch(`/api/admin/referral-sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "فشل التحديث");
    return data.source;
  };

  const toggleActive = async (s) => {
    try {
      const updated = await patchSource(s._id, { isActive: !s.isActive });
      setSources(prev => prev.map(x => (x._id === s._id ? updated : x)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const startEdit  = (s) => { setEditingId(s._id); setEditLabel(s.label); setEditValue(s.value); };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id) => {
    if (!editLabel.trim() || !editValue.trim()) {
      toast.error("لازم تكتب الاسم والقيمة");
      return;
    }
    try {
      const updated = await patchSource(id, { label: editLabel, value: editValue });
      setSources(prev => prev.map(x => (x._id === id ? updated : x)));
      setEditingId(null);
      toast.success("تم التحديث");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = (id, label) => {
    toast((ti) => (
      <div className="w-80 bg-white dark:bg-darklight rounded-2xl shadow-darkmd p-4 border border-gray-200 dark:border-dark_border">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">!</div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">حذف المصدر</p>
            <p className="text-xs text-gray-500 dark:text-darkmuted mt-1">
              متأكد إنك عاوز تمسح <strong className="text-gray-900 dark:text-white">{label}</strong>؟
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={() => toast.dismiss(ti.id)} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-dark_border text-gray-500 dark:text-darktext hover:bg-gray-50 dark:hover:bg-dark_input">
            إلغاء
          </button>
          <button
            onClick={async () => {
              toast.dismiss(ti.id);
              try {
                const res  = await fetch(`/api/admin/referral-sources/${id}`, { method: "DELETE" });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.message || "فشل الحذف");
                setSources(prev => prev.filter(x => x._id !== id));
                toast.success("تم الحذف");
              } catch (err) {
                toast.error(err.message);
              }
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors"
          >
            حذف
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: "top-center" });
  };

  const move = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sources.length) return;

    const current = sources[index];
    const target  = sources[targetIndex];

    const reordered = [...sources];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setSources(reordered);

    try {
      await Promise.all([
        patchSource(current._id, { order: target.order }),
        patchSource(target._id,  { order: current.order }),
      ]);
    } catch (err) {
      toast.error(err.message);
      fetchSources();
    }
  };

  const filtered = sources.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase()) ||
    s.value.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = sources.filter(s => s.isActive).length;

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-darkmode">
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              مصادر التسجيل
            </h1>
            <p className="text-sm text-gray-500 dark:text-darkmuted mt-0.5">
              القيم اللي بتظهر في خطوة "مصدر التسجيل" بفورم الطالب
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{sources.length}</p>
            <p className="text-xs text-gray-500 dark:text-darkmuted mt-1 font-medium">إجمالي المصادر</p>
          </div>
          <div className="p-4 rounded-2xl border border-gray-200 dark:border-dark_border bg-white dark:bg-darklight">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
              <Eye className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{activeCount}</p>
            <p className="text-xs text-gray-500 dark:text-darkmuted mt-1 font-medium">مفعّلة</p>
          </div>
        </div>

        {/* Add form */}
        <div className="bg-white dark:bg-darklight rounded-2xl border border-gray-200 dark:border-dark_border p-4 shadow-sm">
          <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-darktext">الاسم الظاهر</label>
              <input
                className={inputCls}
                value={newLabel}
                placeholder="مثال: TED Talk"
                onChange={e => {
                  setNewLabel(e.target.value);
                  if (!valueTouched) setNewValue(slugify(e.target.value));
                }}
              />
            </div>
            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-darktext">القيمة (value)</label>
              <input
                className={`${inputCls} font-mono`}
                value={newValue}
                placeholder="ted-talk"
                onChange={e => { setValueTouched(true); setNewValue(slugify(e.target.value)); }}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-orange-deep text-white rounded-xl font-semibold text-sm shadow-brand-sm hover:shadow-brand-md transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة
            </button>
          </form>
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-darksubtle pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو القيمة..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-dark_border bg-white dark:bg-dark_input text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-darksubtle focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none transition-all"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-darklight rounded-2xl border border-gray-200 dark:border-dark_border shadow-sm overflow-hidden">
          {loading && (
            <div className="h-0.5 bg-gray-100 dark:bg-dark_border overflow-hidden">
              <div className="h-full bg-primary w-1/3 animate-pulse" />
            </div>
          )}

          {!loading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <GitBranch className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                {search ? "مفيش نتائج مطابقة" : "مفيش مصادر لسه"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-darkmuted">
                {search ? "جرّب كلمة بحث تانية" : "ضيف أول مصدر من الفورم فوق"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-dark_border/50">
              {filtered.map((s, idx) => (
                <div key={s._id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-darkmode/60 transition-colors duration-100">

                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => move(idx, "up")}   disabled={idx === 0}                   className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary disabled:opacity-20">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => move(idx, "down")} disabled={idx === filtered.length - 1} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary disabled:opacity-20">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="flex items-center gap-1 text-[10px] text-gray-400 font-mono w-9 shrink-0">
                    <Hash className="w-2.5 h-2.5" />{s.order}
                  </span>

                  {editingId === s._id ? (
                    <>
                      <input className={`${inputCls} flex-1`} value={editLabel} onChange={e => setEditLabel(e.target.value)} />
                      <input className={`${inputCls} flex-1 font-mono`} value={editValue} onChange={e => setEditValue(slugify(e.target.value))} />
                      <button onClick={() => saveEdit(s._id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark_input text-emerald-600" title="حفظ">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark_input text-gray-400" title="إلغاء">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${s.isActive ? "text-gray-900 dark:text-white" : "text-gray-400 line-through"}`}>
                          {s.label}
                        </p>
                        <code className="text-[10px] text-gray-400 font-mono">{s.value}</code>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        s.isActive
                          ? "bg-emerald-900/40 text-emerald-800 ring-1 ring-emerald-700/50 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700/50"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? "bg-emerald-400" : "bg-gray-400"}`} />
                        {s.isActive ? "مفعّل" : "موقوف"}
                      </span>

                      <div className="flex items-center gap-0.5">
                        <button onClick={() => toggleActive(s)} title={s.isActive ? "إيقاف" : "تفعيل"} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark_input text-amber-500">
                          {s.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => startEdit(s)} title="تعديل" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark_input text-primary">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s._id, s.label)} title="حذف" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark_input text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}