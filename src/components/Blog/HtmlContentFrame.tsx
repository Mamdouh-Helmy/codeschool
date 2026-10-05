// src/components/Blog/HtmlContentFrame.tsx
"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";

interface HtmlContentFrameProps {
  /** الـ HTML الكامل (ممكن يحتوي <style> و <script> أو حتى صفحة كاملة <html>) */
  html: string;
  dir?: "rtl" | "ltr";
  lang?: string;
  minHeight?: number;
  /** تأخير تحديث الـ iframe أثناء الكتابة (للمعاينة في الـ editor) */
  debounceMs?: number;
  className?: string;
  title?: string;
  /**
   * لو اتحددت، الـ iframe بيتجاهل ثيم الموقع ويستخدم الثيم ده
   * (بيستخدمها الـ editor عشان المعاينة ليها زرار light/dark خاص بيها).
   * لو مش متحددة (صفحة المقال) بيتبع ثيم الموقع تلقائياً.
   */
  forceTheme?: "light" | "dark";
}

// ─── مراقبة الدارك مود (كلاس "dark" على <html>) ──────────────────────────────
function useSiteTheme() {
  const [state, setState] = useState({ mounted: false, isDark: false });

  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setState({ mounted: true, isDark: root.classList.contains("dark") });
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return state;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (!delay) {
      setDebounced(value);
      return;
    }
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── الـ CSS الأساسي داخل الـ iframe (بـ :where عشان الـ CSS بتاعك يكسب دايماً) ───
const BASE_CSS = `
:root{
  --bg:transparent; --text:#1f2937; --muted:#6b7280;
  --card:#ffffff; --card-soft:#fff8f0; --border:#ffe8d6;
  --primary:#ff6700; --primary-soft:rgba(255,103,0,.1);
  --secondary:#004d59; --code-bg:#f3f4f6;
  --success:#16a34a; --danger:#dc2626;
}
:root[data-theme="dark"]{
  --text:#e6edf3; --muted:#8b949e;
  --card:#161b22; --card-soft:#21262d; --border:#30363d;
  --primary:#ff6700; --primary-soft:rgba(255,103,0,.15);
  --secondary:#4fb3c2; --code-bg:#21262d;
  --success:#3fb950; --danger:#f85149;
}
*,*::before,*::after{box-sizing:border-box}
html{height:auto}
body{
  margin:0; padding:0; display:flow-root;
  background:var(--bg); color:var(--text);
  font-family:system-ui,-apple-system,"Segoe UI",Tahoma,"Noto Sans Arabic",Arial,sans-serif;
  font-size:16px; line-height:1.85; word-wrap:break-word; overflow-wrap:anywhere;
}
:where(h1,h2,h3,h4,h5,h6){margin:1.4em 0 .5em; line-height:1.3; font-weight:700; color:var(--text)}
:where(h1){font-size:2em} :where(h2){font-size:1.6em} :where(h3){font-size:1.3em}
:where(h4){font-size:1.15em} :where(h5){font-size:1em} :where(h6){font-size:.9em}
:where(p){margin:1em 0}
:where(a){color:var(--primary); text-decoration:none}
:where(a:hover){text-decoration:underline}
:where(img,video,iframe,canvas,svg){max-width:100%}
:where(img){height:auto; border-radius:12px}
:where(ul,ol){margin:1em 0; padding-inline-start:2em}
:where(li){margin:.4em 0}
:where(hr){border:0; border-top:1px solid var(--border); margin:2em 0}
:where(blockquote){
  margin:1em 0; padding:1em 1.4em; font-style:italic; color:var(--muted);
  background:var(--card-soft); border-inline-start:4px solid var(--primary); border-radius:8px;
}
:where(code){background:var(--code-bg); padding:.15em .4em; border-radius:6px; font-size:.9em}
:where(pre){background:var(--code-bg); padding:1em; border-radius:10px; overflow-x:auto; direction:ltr; text-align:left}
:where(pre code){background:none; padding:0}
:where(table){border-collapse:collapse; width:100%; margin:1rem 0; display:block; overflow-x:auto}
:where(th,td){border:1px solid var(--border); padding:10px 12px; text-align:start}
:where(th){background:var(--primary); color:#fff}
:where(mark){background:#fde047; color:#111; padding:0 .2em; border-radius:3px}
:where(button){font:inherit; cursor:pointer}
:where(input,select,textarea,button){color-scheme:light}
:root[data-theme="dark"] :where(input,select,textarea,button){color-scheme:dark}
`;

// ─── سكريبت التشغيل داخل الـ iframe: الارتفاع + الثيم + اللينكات الداخلية ─────
const buildRuntime = (id: string) => `
(function(){
  var ID=${JSON.stringify(id)};
  function sendHeight(){
    var h=Math.ceil(document.body.getBoundingClientRect().height);
    parent.postMessage({type:"blog-frame-height",id:ID,height:h},"*");
  }
  function applyTheme(dark){
    var r=document.documentElement;
    r.setAttribute("data-theme",dark?"dark":"light");
    r.classList.toggle("dark",dark);
    window.dispatchEvent(new CustomEvent("themechange",{detail:{dark:dark}}));
    sendHeight();
  }
  window.addEventListener("message",function(e){
    var d=e.data;
    if(d&&d.type==="blog-frame-theme")applyTheme(!!d.dark);
  });
  if(window.ResizeObserver){new ResizeObserver(sendHeight).observe(document.body);}
  window.addEventListener("load",sendHeight);
  window.addEventListener("resize",sendHeight);
  document.addEventListener("click",function(e){
    var a=e.target&&e.target.closest?e.target.closest('a[href^="#"]'):null;
    if(!a)return;
    var id=a.getAttribute("href").slice(1);
    var el=id&&document.getElementById(id);
    e.preventDefault();
    if(el)el.scrollIntoView({behavior:"smooth"});
  });
  sendHeight();
})();
`;

function buildSrcDoc(opts: {
  html: string;
  dir?: "rtl" | "ltr";
  lang?: string;
  dark: boolean;
  id: string;
}): string {
  const { html, dir, lang, dark, id } = opts;

  const themeBoot =
    `<script>try{var r=document.documentElement;` +
    `r.setAttribute("data-theme",${dark ? '"dark"' : '"light"'});` +
    `r.classList.toggle("dark",${dark});` +
    (dir ? `if(!r.getAttribute("dir"))r.setAttribute("dir","${dir}");` : "") +
    (lang ? `if(!r.getAttribute("lang"))r.setAttribute("lang","${lang}");` : "") +
    `}catch(e){}</script>`;

  const headInject =
    `<meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<base target="_blank">` +
    themeBoot +
    `<style>${BASE_CSS}</style>`;

  const tail = `<script>${buildRuntime(id)}</script>`;

  // لو المستخدم كتب صفحة HTML كاملة
  if (/<html[\s>]/i.test(html)) {
    let out = html;
    if (/<head[\s>]/i.test(out)) {
      out = out.replace(/<head[^>]*>/i, (m) => m + headInject);
    } else {
      out = out.replace(/<html[^>]*>/i, (m) => m + `<head>${headInject}</head>`);
    }
    out = /<\/body>/i.test(out)
      ? out.replace(/<\/body>/i, () => tail + "</body>")
      : out + tail;
    return out;
  }

  return `<!DOCTYPE html><html><head>${headInject}</head><body>${html}${tail}</body></html>`;
}

export default function HtmlContentFrame({
  html,
  dir,
  lang,
  minHeight = 40,
  debounceMs = 0,
  className,
  title = "Blog content",
  forceTheme,
}: HtmlContentFrameProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { mounted, isDark: siteIsDark } = useSiteTheme();
  const [height, setHeight] = useState(minHeight);
  const debouncedHtml = useDebounced(html, debounceMs);

  // ✅ لو forceTheme متحدد بنستخدمه، غير كده بنتبع ثيم الموقع
  const isDark = forceTheme ? forceTheme === "dark" : siteIsDark;

  // الثيم الابتدائي وقت بناء الـ srcDoc (من غير ما يعمل reload لما الثيم يتغير)
  const darkRef = useRef(isDark);
  darkRef.current = isDark;

  const srcDoc = useMemo(
    () =>
      buildSrcDoc({ html: debouncedHtml, dir, lang, dark: darkRef.current, id: reactId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedHtml, dir, lang, reactId, mounted]
  );

  // استقبال الارتفاع من الـ iframe
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const d = e.data;
      if (d && d.type === "blog-frame-height" && d.id === reactId) {
        setHeight(Math.max(minHeight, Number(d.height) || minHeight));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [reactId, minHeight]);

  // مزامنة الثيم مع الـ iframe
  const postTheme = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "blog-frame-theme", dark: isDark },
      "*"
    );
  };
  useEffect(() => {
    if (mounted) postTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, mounted]);

  // تجنّب hydration mismatch: الـ iframe بيترندر بعد الـ mount بس
  if (!mounted) return <div style={{ minHeight }} className={className} />;

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={srcDoc}
      onLoad={postTheme}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"
      scrolling="no"
      loading="lazy"
      className={className}
      style={{
        width: "100%",
        height,
        border: 0,
        display: "block",
        overflow: "hidden",
        background: "transparent",
      }}
    />
  );
}