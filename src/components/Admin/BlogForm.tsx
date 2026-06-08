"use client";
import { useState, useEffect } from "react";
import {
  Calendar, FileText, Image, Tag, User, Upload, X, Save,
  Rocket, Plus, Trash2, Languages, Loader2, TrendingUp,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import RichTextEditor from "../Blog/RichTextEditor";
import s from "./BlogForm.module.css";

interface Props {
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Helper: رفع صورة عبر FormData → Cloudinary ─────────────────────────────
async function uploadImage(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const res = await fetch("/api/upload-image", { method: "POST", body: formData });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload failed");
  return data.imageUrl;
}

function formatDateForInput(dateString: string): string {
  if (!dateString) return "";
  try { return new Date(dateString).toISOString().split("T")[0]; } catch { return ""; }
}

function generateExcerpt(body: string, maxLength = 150): string {
  const plain = body.replace(/<[^>]*>/g, "").trim();
  return plain.length > maxLength ? plain.substring(0, maxLength) + "..." : plain;
}

const buildInitialForm = (initial?: any) => ({
  title_ar:    initial?.title_ar    || "",
  title_en:    initial?.title_en    || "",
  body_ar:     initial?.body_ar     || "",
  body_en:     initial?.body_en     || "",
  excerpt_ar:  initial?.excerpt_ar  || "",
  excerpt_en:  initial?.excerpt_en  || "",
  imageAlt_ar: initial?.imageAlt_ar || "",
  imageAlt_en: initial?.imageAlt_en || "",
  category_ar: initial?.category_ar || "",
  category_en: initial?.category_en || "",
  image:       initial?.image       || "",
  publishDate: formatDateForInput(initial?.publishDate),
  status:      initial?.status      || "draft",
  featured:    initial?.featured    || false,
  viewCount:   initial?.viewCount   || 0,
  author: {
    name_ar: initial?.author?.name_ar || "",
    name_en: initial?.author?.name_en || "",
    email:   initial?.author?.email   || "",
    avatar:  initial?.author?.avatar  || "/images/default-avatar.jpg",
    role:    initial?.author?.role    || "Author",
  },
  tags_ar: initial?.tags_ar || [],
  tags_en: initial?.tags_en || [],
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BlogForm({ initial, onClose, onSaved }: Props) {
  const { t } = useI18n();

  const [form, setForm]                         = useState(() => buildInitialForm(initial));
  const [activeLanguage, setActiveLanguage]     = useState<"ar" | "en">("ar");
  const [loading, setLoading]                   = useState(false);
  const [uploadingImage, setUploadingImage]     = useState(false);
  const [uploadingAvatar, setUploadingAvatar]   = useState(false);

  const [tagsAr, setTagsAr]               = useState<string[]>(initial?.tags_ar || []);
  const [tagsEn, setTagsEn]               = useState<string[]>(initial?.tags_en || []);
  const [newTagInputAr, setNewTagInputAr] = useState("");
  const [newTagInputEn, setNewTagInputEn] = useState("");

  const [imagePreview, setImagePreview]               = useState(initial?.image || "");
  const [authorAvatarPreview, setAuthorAvatarPreview] = useState(
    initial?.author?.avatar || "/images/default-avatar.jpg"
  );

  useEffect(() => { if (form.image)         setImagePreview(form.image); },         [form.image]);
  useEffect(() => { if (form.author.avatar) setAuthorAvatarPreview(form.author.avatar); }, [form.author.avatar]);

  const onChange       = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));
  const onChangeAuthor = (field: string, value: any) => setForm((p) => ({ ...p, author: { ...p.author, [field]: value } }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("حجم الملف كبير جداً. الحد الأقصى 5MB"); return; }
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const url = await uploadImage(file, "blog-posts");
      onChange("image", url); setImagePreview(url);
    } catch (err: any) {
      alert(`خطأ في رفع الصورة: ${err.message}`);
      setImagePreview(initial?.image || ""); onChange("image", initial?.image || "");
    } finally { setUploadingImage(false); e.target.value = ""; }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("حجم الملف كبير جداً. الحد الأقصى 2MB"); return; }
    setAuthorAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, "blog-authors");
      onChangeAuthor("avatar", url); setAuthorAvatarPreview(url);
    } catch (err: any) {
      alert(`خطأ في رفع الصورة: ${err.message}`);
      const fallback = initial?.author?.avatar || "/images/default-avatar.jpg";
      setAuthorAvatarPreview(fallback); onChangeAuthor("avatar", fallback);
    } finally { setUploadingAvatar(false); e.target.value = ""; }
  };

  const addTag = (lang: "ar" | "en") => {
    if (lang === "ar") {
      const tag = newTagInputAr.trim();
      if (!tag || tagsAr.includes(tag)) return;
      const next = [...tagsAr, tag]; setTagsAr(next); onChange("tags_ar", next); setNewTagInputAr("");
    } else {
      const tag = newTagInputEn.trim();
      if (!tag || tagsEn.includes(tag)) return;
      const next = [...tagsEn, tag]; setTagsEn(next); onChange("tags_en", next); setNewTagInputEn("");
    }
  };

  const removeTag = (lang: "ar" | "en", index: number) => {
    if (lang === "ar") { const next = tagsAr.filter((_, i) => i !== index); setTagsAr(next); onChange("tags_ar", next); }
    else               { const next = tagsEn.filter((_, i) => i !== index); setTagsEn(next); onChange("tags_en", next); }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent, lang: "ar" | "en") => {
    if (e.key === "Enter") { e.preventDefault(); addTag(lang); }
  };

  const handleBodyChange = (value: string, lang: "ar" | "en") => {
    const bodyField      = lang === "ar" ? "body_ar"    : "body_en";
    const excerptField   = lang === "ar" ? "excerpt_ar" : "excerpt_en";
    const currentExcerpt = lang === "ar" ? form.excerpt_ar : form.excerpt_en;
    const oldExcerpt     = generateExcerpt(lang === "ar" ? form.body_ar : form.body_en);
    onChange(bodyField, value);
    if (!currentExcerpt || currentExcerpt === oldExcerpt) onChange(excerptField, generateExcerpt(value));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title_ar && !form.title_en) { alert("الرجاء إدخال عنوان المقال بالعربية أو الإنجليزية"); return; }
    if (!form.body_ar  && !form.body_en)  { alert("الرجاء إدخال محتوى المقال بالعربية أو الإنجليزية"); return; }
    setLoading(true);
    try {
      const payload = {
        ...form, tags_ar: tagsAr, tags_en: tagsEn,
        publishDate: form.publishDate ? new Date(form.publishDate).toISOString() : new Date().toISOString(),
      };
      const method = initial?._id ? "PUT" : "POST";
      const url    = initial?._id ? `/api/blog/${encodeURIComponent(initial._id)}` : "/api/blog";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        let msg = `HTTP error! status: ${res.status}`;
        try { const d = await res.json(); msg = d.message || msg; } catch {}
        throw new Error(msg);
      }
      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Operation failed");
      alert(result.message || "تم حفظ المقال بنجاح!");
      onSaved(); onClose();
    } catch (err: any) {
      alert(`خطأ: ${err.message || "حدث خطأ غير معروف"}`);
    } finally { setLoading(false); }
  };

  const isUploading = uploadingImage || uploadingAvatar;
  const isDisabled  = loading || isUploading;
  const lang        = activeLanguage;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={submit} className={s.form}>

      {/* ── 1. Language Selector ── */}
      <Section
        icon={<Languages className="w-4 h-4" />} iconColor="#f97316" iconBg="rgba(249,115,22,0.1)"
        title={t("blogForm.language") || "اختيار اللغة"}
        desc={t("blogForm.languageDescription") || "اختر اللغة التي تريد تحريرها"}
        stepNumber={1}
      >
        <div className={s.langToggle}>
          {(["ar", "en"] as const).map((l) => (
            <button
              key={l} type="button"
              onClick={() => setActiveLanguage(l)}
              className={`${s.langBtn} ${lang === l ? s.langBtnActive : ""}`}
            >
              <span className={`${s.langIcon} ${lang !== l ? s.langIconInactive : ""}`}>
                {l === "ar" ? "ع" : "A"}
              </span>
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </Section>

      {/* ── 2. Basic Info ── */}
      <Section
        icon={<FileText className="w-4 h-4" />} iconColor="#f97316" iconBg="rgba(249,115,22,0.1)"
        title={t("blogForm.basicInfo") || "معلومات المقال"}
        desc={t("blogForm.basicInfoDescription") || "التفاصيل الأساسية عن مقال المدونة"}
        badge={lang === "ar" ? "العربية" : "English"}
        stepNumber={2}
      >
        <FormField label={`${t("blogForm.title") || "عنوان المقال"} *`}>
          <input
            type="text"
            value={lang === "ar" ? form.title_ar : form.title_en}
            onChange={(e) => onChange(lang === "ar" ? "title_ar" : "title_en", e.target.value)}
            placeholder={lang === "ar" ? "أدخل عنوان المقال" : "Enter blog post title"}
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={s.input}
            required
          />
        </FormField>

        <FormField label={t("blogForm.excerpt") || "الملخص"}>
          <textarea
            value={lang === "ar" ? form.excerpt_ar : form.excerpt_en}
            onChange={(e) => onChange(lang === "ar" ? "excerpt_ar" : "excerpt_en", e.target.value)}
            rows={3}
            placeholder={lang === "ar" ? "وصف مختصر (يتم توليده تلقائياً)" : "Brief description (auto-generated)"}
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={s.input}
          />
        </FormField>

        <FormField label={t("blogForm.category") || "التصنيف"}>
          <input
            type="text"
            value={lang === "ar" ? form.category_ar : form.category_en}
            onChange={(e) => onChange(lang === "ar" ? "category_ar" : "category_en", e.target.value)}
            placeholder={lang === "ar" ? "مثل: تكنولوجيا، أعمال" : "e.g., Technology, Business"}
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={s.input}
          />
        </FormField>
      </Section>

      {/* ── 3. Author ── */}
      <Section
        icon={<User className="w-4 h-4" />} iconColor="#06b6d4" iconBg="rgba(6,182,212,0.1)"
        title={t("blogForm.authorInfo") || "معلومات الكاتب"}
        desc={t("blogForm.authorInfoDescription") || "تفاصيل عن صاحب المقال"}
        badge={lang === "ar" ? "العربية" : "English"}
        stepNumber={3}
      >
        <FormField label={`${t("blogForm.authorName") || "اسم الكاتب"} *`}>
          <input
            type="text"
            value={lang === "ar" ? form.author.name_ar : form.author.name_en}
            onChange={(e) => onChangeAuthor(lang === "ar" ? "name_ar" : "name_en", e.target.value)}
            placeholder={lang === "ar" ? "اسم المؤلف" : "Author name"}
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={s.input}
            required
          />
        </FormField>

        <div className={s.grid2}>
          <FormField label={t("blogForm.authorEmail") || "البريد الإلكتروني"}>
            <input type="email" value={form.author.email} onChange={(e) => onChangeAuthor("email", e.target.value)} placeholder="author@example.com" className={s.input} />
          </FormField>
          <FormField label={t("blogForm.authorRole") || "الدور"}>
            <select value={form.author.role} onChange={(e) => onChangeAuthor("role", e.target.value)} className={s.input}>
              {["Author", "Editor", "Contributor", "Admin", "Guest"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Avatar */}
        <FormField label={t("blogForm.authorAvatar") || "صورة الكاتب"}>
          <div className={s.avatarRow}>
            <div className={s.avatarWrap}>
              {authorAvatarPreview
                ? <div className={s.avatarImg}><img src={authorAvatarPreview} alt="Avatar" className={s.avatarImgInner} />{uploadingAvatar && <UploadOverlay />}</div>
                : <div className={s.avatarPlaceholder}><User size={24} /></div>
              }
              <label className={`${s.avatarUploadBadge} ${isDisabled ? s.disabled : ""}`}>
                <Upload size={12} />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar || isDisabled} className="hidden" style={{display:"none"}} />
              </label>
            </div>
            <div className={s.avatarInputGroup}>
              <input
                type="text"
                value={form.author.avatar}
                onChange={(e) => onChangeAuthor("avatar", e.target.value)}
                placeholder={t("blogForm.avatarPlaceholder") || "رابط الصورة أو ارفع ملفاً"}
                className={s.input}
                disabled={uploadingAvatar}
              />
              <div className={s.avatarActions}>
                <UploadLabel uploading={uploadingAvatar} label={t("blogForm.uploadAvatar") || "رفع صورة"} accept="image/*" onChange={handleAvatarUpload} disabled={isDisabled} />
                {authorAvatarPreview && !uploadingAvatar && (
                  <button type="button" onClick={() => { onChangeAuthor("avatar", "/images/default-avatar.jpg"); setAuthorAvatarPreview(""); }} className={s.removeBtn}>
                    <Trash2 size={12} /> {t("blogForm.remove") || "حذف"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </FormField>
      </Section>

      {/* ── 4. Content ── */}
      <Section
        icon={<FileText className="w-4 h-4" />} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.1)"
        title={t("blogForm.content") || "المحتوى"}
        desc={t("blogForm.contentDescription") || "المحتوى الرئيسي للمقال"}
        badge={lang === "ar" ? "العربية" : "English"}
        stepNumber={4}
      >
        <RichTextEditor
          value={lang === "ar" ? form.body_ar : form.body_en}
          onChange={(v) => handleBodyChange(v, lang)}
          placeholder={lang === "ar" ? "اكتب محتوى المقال هنا..." : "Write your blog post content here..."}
        />
      </Section>

      {/* ── 5. Media ── */}
      <Section
        icon={<Image className="w-4 h-4" />} iconColor="#22d3ee" iconBg="rgba(34,211,238,0.1)"
        title={t("blogForm.media") || "الوسائط"}
        desc={t("blogForm.mediaDescription") || "الصورة المميزة للمقال"}
        stepNumber={5}
      >
        <FormField label={t("blogForm.featuredImage") || "الصورة المميزة"}>
          {imagePreview ? (
            <div className={s.imagePreviewCard}>
              <img src={imagePreview} alt="Preview" />
              {uploadingImage && <UploadOverlay />}
              {!uploadingImage && (
                <div className={s.imagePreviewOverlay}>
                  <UploadLabel uploading={uploadingImage} label={t("blogForm.changeImage") || "تغيير"} accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload} disabled={isDisabled} />
                  <button type="button" onClick={() => { onChange("image", ""); setImagePreview(""); }} className={s.removeBtn}>
                    <Trash2 size={12} /> {t("blogForm.removeImage") || "حذف"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <label className={`${s.imageZone} ${isDisabled ? s.disabled : ""}`}>
              <div className={s.imageZoneIcon}><Upload size={20} /></div>
              <div>
                <p className={s.imageZoneTitle}>{t("blogForm.uploadImage") || "رفع صورة"}</p>
                <p className={s.imageZoneHint}>{t("blogForm.imageRequirements") || "Max: 5MB • JPEG, PNG, WebP"}</p>
              </div>
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload} disabled={isDisabled} style={{display:"none"}} />
            </label>
          )}
          <input
            type="url"
            value={form.image}
            onChange={(e) => onChange("image", e.target.value)}
            placeholder="أو أدخل رابط الصورة مباشرة"
            className={s.input}
            disabled={uploadingImage}
            style={{ marginTop: "10px" }}
          />
        </FormField>

        <FormField label={`${t("blogForm.imageAlt") || "النص البديل للصورة"} — ${lang === "ar" ? "العربية" : "English"}`}>
          <input
            type="text"
            value={lang === "ar" ? form.imageAlt_ar : form.imageAlt_en}
            onChange={(e) => onChange(lang === "ar" ? "imageAlt_ar" : "imageAlt_en", e.target.value)}
            placeholder={lang === "ar" ? "وصف الصورة لإمكانية الوصول" : "Image description for accessibility"}
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={s.input}
          />
        </FormField>
      </Section>

      {/* ── 6. Tags ── */}
      <Section
        icon={<Tag className="w-4 h-4" />} iconColor="#f97316" iconBg="rgba(249,115,22,0.1)"
        title={t("blogForm.tags") || "الوسوم"}
        desc={t("blogForm.tagsDescription") || "أضف وسوماً لتصنيف أفضل"}
        badge={lang === "ar" ? "العربية" : "English"}
        stepNumber={6}
      >
        <div className={s.tagInputRow}>
          <input
            type="text"
            value={lang === "ar" ? newTagInputAr : newTagInputEn}
            onChange={(e) => lang === "ar" ? setNewTagInputAr(e.target.value) : setNewTagInputEn(e.target.value)}
            onKeyPress={(e) => handleTagKeyPress(e, lang)}
            placeholder={lang === "ar" ? "أدخل وسم واضغط Enter" : "Enter a tag and press Enter"}
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={s.input}
          />
          <button
            type="button"
            onClick={() => addTag(lang)}
            disabled={lang === "ar" ? !newTagInputAr.trim() : !newTagInputEn.trim()}
            className={s.addTagBtn}
          >
            <Plus size={16} /> {t("common.add") || "إضافة"}
          </button>
        </div>

        {(lang === "ar" ? tagsAr : tagsEn).length > 0 && (
          <div className={s.tagZone}>
            {(lang === "ar" ? tagsAr : tagsEn).map((tag, i) => (
              <span key={i} className={s.tag}>
                <span className={s.tagDot} />
                {tag}
                <button type="button" onClick={() => removeTag(lang, i)} className={s.tagRemove}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* ── 7. Schedule & Settings ── */}
      <Section
        icon={<Calendar className="w-4 h-4" />} iconColor="#f97316" iconBg="rgba(249,115,22,0.1)"
        title={t("blogForm.scheduleSettings") || "الجدولة والإعدادات"}
        desc={t("blogForm.scheduleDescription") || "خيارات النشر وإعدادات المقال"}
        stepNumber={7}
      >
        <div className={s.grid2}>
          <FormField label={t("blogForm.publishDate") || "تاريخ النشر"}>
            <input type="date" value={form.publishDate} onChange={(e) => onChange("publishDate", e.target.value)} className={s.input} />
          </FormField>
          <FormField label={t("blogForm.status") || "الحالة"}>
            <div className={s.selectWrap}>
              <span className={`${s.statusDot} ${form.status === "published" ? s.statusDotPublished : s.statusDotDraft}`} />
              <select value={form.status} onChange={(e) => onChange("status", e.target.value)} className={s.input}>
                <option value="draft">{t("blogForm.status.draft") || "مسودة"}</option>
                <option value="published">{t("blogForm.status.published") || "منشور"}</option>
              </select>
            </div>
          </FormField>
        </div>

        <FormField label={t("blogForm.viewCount") || "عدد المشاهدات"}>
          <div className={s.iconInputWrap}>
            <TrendingUp size={16} className={s.inputIcon} />
            <input
              type="number" min="0"
              value={form.viewCount}
              onChange={(e) => onChange("viewCount", parseInt(e.target.value) || 0)}
              className={s.input}
            />
          </div>
          <p className={s.hint}>{t("blogForm.viewCountHint") || "يمكنك التحكم في عدد المشاهدات يدوياً."}</p>
        </FormField>

        {/* Featured */}
        <label className={`${s.featuredCard} ${form.featured ? s.featuredCardActive : ""}`}>
          <div className={`${s.customCheckbox} ${form.featured ? s.customCheckboxActive : ""}`}>
            {form.featured && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <input type="checkbox" checked={form.featured} onChange={(e) => onChange("featured", e.target.checked)} style={{display:"none"}} />
          <div className={s.featuredText}>
            <p className={s.featuredTitle}>{t("blogForm.featuredPost") || "مقال مميز"}</p>
            <p className={s.featuredDesc}>{t("blogForm.featuredDescription") || "إبراز هذا المقال في الصفحة الرئيسية للمدونة"}</p>
          </div>
          {form.featured && <span className={s.featuredPill}>مميز ⭐</span>}
        </label>
      </Section>

      {/* ── Actions ── */}
      <div className={s.actions}>
        <button type="button" onClick={onClose} disabled={isDisabled} className={s.cancelBtn}>
          <X size={16} /> {t("common.cancel") || "إلغاء"}
        </button>
        <button type="submit" disabled={isDisabled} className={s.submitBtn}>
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> {t("common.saving") || "جاري الحفظ..."}</>
          ) : initial ? (
            <><Save size={16} /> {t("blogForm.updatePost") || "تحديث المقال"}</>
          ) : (
            <><Rocket size={16} /> {t("blog.createPost") || "نشر المقال"}</>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  icon, iconColor, iconBg, title, desc, badge, stepNumber, children,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  desc?: string;
  badge?: string;
  stepNumber?: number;
  children: React.ReactNode;
}) {
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        {stepNumber && <span className={s.stepNum}>{stepNumber}</span>}
        <div className={s.sectionIcon} style={{ background: iconBg, color: iconColor }}>{icon}</div>
        <div className={s.sectionTitles}>
          <div className={s.sectionTitleRow}>
            <h3 className={s.sectionTitle}>{title}</h3>
            {badge && <span className={s.sectionBadge}>{badge}</span>}
          </div>
          {desc && <p className={s.sectionDesc}>{desc}</p>}
        </div>
      </div>
      <div className={s.sectionBody}>{children}</div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.field}>
      <label className={s.label}>{label}</label>
      {children}
    </div>
  );
}

function UploadLabel({ uploading, label, accept, onChange, disabled }: {
  uploading: boolean; label: string; accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`${s.uploadBtn} ${uploading || disabled ? s.disabled : ""}`}>
      {uploading ? <><Loader2 size={12} className="animate-spin" /> جاري الرفع...</> : <><Upload size={12} /> {label}</>}
      <input type="file" accept={accept} onChange={onChange} disabled={uploading || disabled} style={{display:"none"}} />
    </label>
  );
}

function UploadOverlay() {
  return (
    <div className={s.uploadOverlay}>
      <div className={s.uploadOverlayInner}>
        <Loader2 size={14} className="animate-spin" style={{color:"white"}} />
        <span className={s.uploadOverlayText}>جاري الرفع...</span>
      </div>
    </div>
  );
}