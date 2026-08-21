// app/(public)/session-blog/[sessionId]/page.jsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Loader2,
  AlertCircle,
  Clock3,
  Layers,
  Languages,
} from "lucide-react";

export default function SessionBlogPage() {
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [lang, setLang] = useState("ar");

  useEffect(() => {
    async function fetchBlog() {
      try {
        const res = await fetch(`/api/public/session-blog/${sessionId}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setLang(json.data.blogBodyAr?.trim() ? "ar" : "en");
        } else {
          setError(json.message || "حدث خطأ");
        }
      } catch {
        setError("خطأ في الاتصال");
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) fetchBlog();
  }, [sessionId]);

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-IcyBreeze dark:bg-darkmode transition-colors">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-brand-primary opacity-20 blur-xl absolute inset-0" />
            <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
          </div>
          <p className="text-sm font-semibold text-SlateBlueText dark:text-darkmuted">
            جاري تحميل الجلسة...
          </p>
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-IcyBreeze dark:bg-darkmode px-4 transition-colors"
        dir="rtl"
      >
        <div className="text-center bg-white dark:bg-darkcard border border-PowderBlueBorder dark:border-dark_border rounded-2xl px-8 py-10 shadow-round-box dark:shadow-none max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-MidnightNavyText dark:text-white font-bold mb-1">
            {error || "لا يوجد محتوى"}
          </p>
          <p className="text-sm text-SlateBlueText dark:text-darkmuted">
            تأكد من الرابط أو حاول مرة أخرى لاحقًا
          </p>
        </div>
      </div>
    );
  }

  const hasAr = !!data.blogBodyAr?.trim();
  const hasEn = !!data.blogBodyEn?.trim();
  const isAr = lang === "ar";
  const body = isAr ? data.blogBodyAr : data.blogBodyEn;

  // تقدير وقت القراءة
  const plainText = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plainText ? plainText.split(" ").length : 0;
  const readingMinutes = Math.max(1, Math.round(wordCount / 180));

  return (
    <div className="min-h-screen bg-IcyBreeze dark:bg-darkmode transition-colors py-16">
      {/* ================= HERO ================= */}
      <div
        className="relative overflow-hidden bg-brand-primary dark:bg-brand-dark"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* decorative blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-5 pt-12 pb-20 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </span>
            <span className="text-white/80 text-xs font-bold tracking-wide uppercase">
              {isAr ? "ملخص الجلسة" : "Session Summary"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 leading-snug">
            {data.sessionTitle}
          </h1>

          <p className="text-white/70 text-sm mb-5">
            {data.courseTitle} · {data.moduleTitle}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              {data.moduleTitle}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-semibold">
              <Clock3 className="w-3.5 h-3.5" />
              {readingMinutes} {isAr ? "دقائق قراءة" : "min read"}
            </span>
          </div>
        </div>
      </div>

      {/* ================= CONTENT CARD ================= */}
      <div className="max-w-6xl mx-auto px-5 -mt-12 relative z-10 pb-16">
        <div className="bg-white dark:bg-darkcard rounded-2xl shadow-brand-lg dark:shadow-none border border-transparent dark:border-dark_border overflow-hidden">
          {data.blogImage && (
            <div className="w-full h-56 sm:h-72 overflow-hidden bg-gray-100 dark:bg-dark_input">
              <img
                src={data.blogImage}
                alt={data.sessionTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {hasAr && hasEn && (
            <div className="flex items-center gap-2 px-6 pt-5">
              <Languages className="w-4 h-4 text-SlateBlueText dark:text-darkmuted shrink-0" />
              <div className="flex gap-1 p-1 bg-IcyBreeze dark:bg-dark_input rounded-full">
                <button
                  onClick={() => setLang("ar")}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    isAr
                      ? "bg-primary text-white shadow-brand-sm"
                      : "text-SlateBlueText dark:text-darkmuted hover:text-primary"
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    !isAr
                      ? "bg-primary text-white shadow-brand-sm"
                      : "text-SlateBlueText dark:text-darkmuted hover:text-primary"
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div
              className="blog-content"
              dir={isAr ? "rtl" : "ltr"}
              dangerouslySetInnerHTML={{ __html: body }}
            />
          </div>
        </div>
      </div>

      {/* ================= CONTENT TYPOGRAPHY ================= */}
      <style jsx global>{`
        .blog-content {
          color: #3b4a54;
          font-size: 15.5px;
          line-height: 1.9;
        }
        .dark .blog-content {
          color: #c9d1d9;
        }

        .blog-content h1,
        .blog-content h2,
        .blog-content h3,
        .blog-content h4,
        .blog-content h5,
        .blog-content h6 {
          font-weight: 800;
          color: #004d59;
          margin: 1.6em 0 0.6em;
          line-height: 1.4;
        }
        .dark .blog-content h1,
        .dark .blog-content h2,
        .dark .blog-content h3,
        .dark .blog-content h4,
        .dark .blog-content h5,
        .dark .blog-content h6 {
          color: #ffffff;
        }
        .blog-content h1 { font-size: 1.75em; }
        .blog-content h2 {
          font-size: 1.4em;
          padding-bottom: 0.35em;
          border-bottom: 2px solid #ffe8d6;
        }
        .dark .blog-content h2 { border-bottom-color: #30363d; }
        .blog-content h3 { font-size: 1.2em; color: #ff6700; }
        .dark .blog-content h3 { color: #ff8a3d; }
        .blog-content h4 { font-size: 1.05em; }
        .blog-content h5,
        .blog-content h6 { font-size: 1em; }

        .blog-content p { margin: 1em 0; }

        .blog-content strong { color: #004d59; font-weight: 800; }
        .dark .blog-content strong { color: #fff; }

        .blog-content a {
          color: #ff6700;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .dark .blog-content a { color: #ff8a3d; }

        .blog-content ul,
        .blog-content ol {
          margin: 1.1em 0;
          padding-inline-start: 1.5em;
        }
        .blog-content ul { list-style: disc; }
        .blog-content ol { list-style: decimal; }
        .blog-content li { margin: 0.5em 0; }
        .blog-content li::marker { color: #ff6700; font-weight: 700; }

        .blog-content img {
          border-radius: 14px !important;
          box-shadow: 0 8px 24px rgba(0, 77, 89, 0.15) !important;
          margin: 1.4em auto !important;
          display: block;
        }
        .dark .blog-content img {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
        }

        .blog-content blockquote,
        .blog-content .blockquote-container blockquote {
          border-inline-start: 4px solid #ff6700 !important;
          background: #fff3e0 !important;
          color: #004d59 !important;
          padding: 1em 1.4em !important;
          border-radius: 10px;
          font-style: italic;
          margin: 1em 0 !important;
        }
        .dark .blog-content blockquote,
        .dark .blog-content .blockquote-container blockquote {
          background: #21262d !important;
          color: #e6edf3 !important;
          border-inline-start-color: #ff8a3d !important;
        }

        .blog-content code {
          background: #f1f5f9;
          color: #004d59;
          padding: 0.15em 0.5em;
          border-radius: 6px;
          font-size: 0.9em;
          font-family: ui-monospace, monospace;
        }
        .dark .blog-content code {
          background: #21262d;
          color: #ff8a3d;
        }

        .blog-content mark {
          background: #feaf00;
          color: #1a1a1a;
          padding: 0.05em 0.3em;
          border-radius: 4px;
        }

        .blog-content hr {
          border: none;
          border-top: 2px dashed #ffd9b3;
          margin: 2.2em 0;
        }
        .dark .blog-content hr { border-top-color: #30363d; }

        .blog-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.4em 0;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .blog-content th,
        .blog-content td {
          border: 1px solid #ffe8d6;
          padding: 10px 14px;
          text-align: start;
        }
        .blog-content th {
          background: #004d59;
          color: #fff;
          font-weight: 700;
        }
        .dark .blog-content th,
        .dark .blog-content td { border-color: #30363d; }
        .dark .blog-content td { background: #161b22; }
        .dark .blog-content th { background: #002a33; }

        .blog-content sub,
        .blog-content sup { color: #ff6700; }
      `}</style>
    </div>
  );
}