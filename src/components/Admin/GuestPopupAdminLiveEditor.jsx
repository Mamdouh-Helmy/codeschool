"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Save, Moon, Sun, Loader2, Upload,
  CheckCircle, AlertCircle, Eye, EyeOff,
  CheckCircle2, ArrowLeft, ArrowRight,
} from "lucide-react";

const C = {
  primary:      "#8c52ff",
  MidnightNavy: "#102D47",
  SlateBlue:    "#547593",
  IcyBreeze:    "#EFFBFF",
  amber:        "#feaf00",
  teal:         "#0f766e",
  darkmode:     "#011120",
  darklight:    "#0d1a2c",
  darktext:     "#7F8487",
  dark_border:  "#224767",
  dark_input:   "#1B2430",
  PowderBlue:   "#E1F1F6",
};

const DEFAULT = {
  titleAr: "شوف ملفك وهو", titleAccentAr: "بيتوثّق",
  subtitle1Ar: "يسعدنا الانضمام للأسبقين في تأسيس الـ Personal Portfolio الخاص بك.",
  subtitle2Ar: "منصة مصممة خصيصًا لتعكس خبراتك وتبرز مهاراتك بشكل احترافي، يسهل مشاركتها مع شبكة علاقاتك أو جهات عمل مستقبلية.",
  point1TitleAr: "مسار مهني منظم", point1Ar: "قدّم نفسك بشكل معتمد وموثوق في مجالك.",
  point2TitleAr: "أدوات عرض ذكية", point2Ar: "أبرز إنجازاتك بأفضل صورة ممكنة.",
  ctaAr: "ابدأ في إضافة بياناتك وتحديث مسارك المهني",
  buttonAr: "ابدأ بناء ملفك الشخصي",
  tag1Ar: "مهارة", tag2Ar: "مهارة", tag3Ar: "+٥", liveAr: "موثّق",

  titleEn: "Watch your profile", titleAccentEn: "get verified",
  subtitle1En: "We're excited to have you among the first to build your Personal Portfolio.",
  subtitle2En: "A platform designed to reflect your experience and highlight your skills professionally — easy to share with your network or future employers.",
  point1TitleEn: "A career, organized", point1En: "Present yourself as a credible, verified expert in your field.",
  point2TitleEn: "Smart showcase tools", point2En: "Highlight your achievements in the best possible light.",
  ctaEn: "Start adding your info and updating your career path.",
  buttonEn: "Build My Portfolio",
  tag1En: "Skill", tag2En: "Skill", tag3En: "+5", liveEn: "Verified",

  buttonLink: "/portfolio/builder",
  stampLogoUrl: "",
  isActive: true,
};

/* ── ضغط الصورة قبل الإرسال ── */
function compressImage(file, maxWidth = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const scale  = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png", quality));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("فشل تحميل الصورة"));
    };
    img.src = url;
  });
}

/* ── Editable ── */
function Editable({ fieldKey, value, onChange, tag: Tag = "span", multiline = false,
  placeholder = "انقر للتحرير...", style = {} }) {
  const ref       = useRef(null);
  const lastSaved = useRef(value);
  const isFocused = useRef(false);
  const [hov, setHov] = useState(false);
  const [foc, setFoc] = useState(false);

  useEffect(() => {
    // ✅ حدّث الـ DOM لو المستخدم مش بيكتب دلوقتي، ولو القيمة الجديدة
    // مختلفة عن آخر قيمة اتعرضت (سواء بسبب تغيير fieldKey أو وصول داتا من الـ API)
    if (ref.current && !isFocused.current && value !== lastSaved.current) {
      ref.current.innerText = value ?? "";
      lastSaved.current = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey, value]); // ✅ الإصلاح: بنراقب value كمان مش fieldKey لوحده

  const onFocus = () => { isFocused.current = true; setFoc(true); };
  const onBlur  = () => {
    isFocused.current = false; setFoc(false);
    const next = ref.current?.innerText ?? "";
    if (next !== lastSaved.current) { lastSaved.current = next; onChange(next); }
  };
  const onKeyDown = (e) => {
    if (!multiline && e.key === "Enter") { e.preventDefault(); ref.current?.blur(); }
    if (e.key === "Escape") ref.current?.blur();
  };

  return (
    <Tag ref={ref} contentEditable suppressContentEditableWarning
      onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={foc ? "" : "انقر للتحرير"}
      style={{
        outline: "none", cursor: foc ? "text" : "pointer",
        borderRadius: 4, padding: "1px 4px",
        background: foc ? `${C.primary}12` : hov ? `${C.primary}09` : "transparent",
        boxShadow: foc
          ? `0 0 0 2px ${C.primary}77, inset 0 0 0 1px ${C.primary}33`
          : hov ? `0 0 0 1px ${C.primary}44` : "none",
        transition: "box-shadow .15s, background .15s",
        wordBreak: "break-word", whiteSpace: multiline ? "pre-wrap" : "normal",
        minWidth: 20, display: "inline", ...style,
      }}
    />
  );
}

/* ── EditableImage ── */
function EditableImage({ src, alt, uploading, onUpload, style = {} }) {
  const fileRef = useRef(null);
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position:"relative", cursor:"pointer", ...style }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => fileRef.current?.click()} title="انقر لتغيير الصورة">
      {src
        ? <img src={src} alt={alt} style={{ width:"100%",height:"100%",objectFit:"contain",display:"block" }} onError={e=>{e.target.style.opacity=0}}/>
        : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#8c52ff" }}>⚡</div>
      }
      {(hov || uploading) && (
        <div style={{ position:"absolute",inset:0,background:"rgba(140,82,255,.6)",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"inherit" }}>
          {uploading
            ? <Loader2 size={12} color="#fff" style={{animation:"spin 1s linear infinite"}}/>
            : <Upload size={12} color="#fff"/>}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onUpload}/>
    </div>
  );
}

/* ════════ GUEST POPUP PREVIEW ════════ */
function GuestPopupTemplate({ data, lang, dark, set, uploadStampLogo, uploadingStamp }) {
  const isRTL = lang === "ar";
  const s     = isRTL ? "Ar" : "En";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const titleClr = dark ? "#f1f5f9" : C.MidnightNavy;
  const subClr   = dark ? C.darktext : C.SlateBlue;
  const cardBg   = dark ? "#0d1a2c" : "#fff";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} style={{ width:"100%", maxWidth:520, margin:"0 auto", borderRadius:22, overflow:"hidden", boxShadow: dark ? "0 24px 64px rgba(0,0,0,.5)" : "0 24px 64px rgba(0,0,0,.14)", background: cardBg }}>

      {/* Hero: mini portfolio mockup + stamp */}
      <div style={{ position:"relative", overflow:"hidden", background: dark ? `linear-gradient(135deg, ${C.darkmode}, #0f2a3d)` : `linear-gradient(135deg, ${C.IcyBreeze}, #e6f7fb)`, padding:"28px 32px 40px" }}>
        <div style={{ position:"relative", margin:"0 auto", width:"56%" }}>
          <div style={{ position:"relative", background: dark ? "#132238" : "#fff", borderRadius:14, boxShadow:"0 8px 24px rgba(0,0,0,.12)", border:`1px solid ${dark ? C.dark_border : "#e6e9f5"}`, padding:14, transform: isRTL ? "rotate(2.5deg)" : "rotate(-2.5deg)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:C.primary, flexShrink:0 }}/>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
                <div style={{ height:7, width:"60%", borderRadius:4, background: dark ? "rgba(255,255,255,.2)" : `${C.SlateBlue}44` }}/>
                <div style={{ height:5, width:"40%", borderRadius:4, background: dark ? "rgba(255,255,255,.1)" : `${C.SlateBlue}22` }}/>
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
              {["tag1","tag2","tag3"].map((k) => (
                <span key={k} style={{ fontSize:9, fontWeight:600, padding:"2px 7px", borderRadius:20, background:`${C.amber}26`, color: dark ? C.amber : C.teal }}>
                  <Editable fieldKey={`${k}${s}`} value={data[`${k}${s}`]} onChange={v=>set(`${k}${s}`,v)} style={{fontSize:9, fontWeight:600, color:"inherit"}}/>
                </span>
              ))}
            </div>
            <div style={{ height:1, width:"100%", background: dark ? C.dark_border : "#e6e9f5", marginBottom:6 }}/>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background: dark ? C.amber : C.SlateBlue }}/>
              <span style={{ fontSize:9, fontWeight:600, color: dark ? "#8a97a8" : `${C.SlateBlue}b0` }}>
                <Editable fieldKey={`live${s}`} value={data[`live${s}`]} onChange={v=>set(`live${s}`,v)} style={{fontSize:9, fontWeight:600, color:"inherit"}}/>
              </span>
            </div>
          </div>

          {/* Verified stamp */}
          <div style={{ position:"absolute", top:-20, [isRTL?"left":"right"]: -28, width:76, height:76, transform: isRTL ? "rotate(8deg)" : "rotate(-14deg)" }}>
            <svg viewBox="0 0 120 120" style={{ width:"100%", height:"100%", color: dark ? C.amber : C.teal }}>
              <circle cx="60" cy="60" r="58" fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2"/>
              <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.5"/>
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <EditableImage
                src={data.stampLogoUrl}
                alt="Stamp Logo"
                uploading={uploadingStamp}
                onUpload={uploadStampLogo}
                style={{ width:30, height:30, borderRadius:"50%", background: dark ? C.darkmode : "#fff", boxShadow:"0 2px 6px rgba(0,0,0,.15)", overflow:"hidden" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:"28px 30px", textAlign: isRTL ? "right" : "left" }}>
        <h2 style={{ fontSize:"clamp(1.4rem, 4vw, 1.9rem)", fontWeight:800, color:titleClr, lineHeight:1.25, margin:"0 0 14px" }}>
          <Editable fieldKey={`title${s}`} value={data[`title${s}`]} onChange={v=>set(`title${s}`,v)} style={{color:"inherit", fontWeight:"inherit", fontSize:"inherit"}}/>
          {" "}
          <span style={{ position:"relative", display:"inline-block", color:C.primary }}>
            <Editable fieldKey={`titleAccent${s}`} value={data[`titleAccent${s}`]} onChange={v=>set(`titleAccent${s}`,v)} style={{color:"inherit", fontWeight:"inherit", fontSize:"inherit"}}/>
          </span>
        </h2>

        <p style={{ fontSize:14, color:subClr, lineHeight:1.7, margin:"0 0 10px" }}>
          <Editable fieldKey={`subtitle1${s}`} multiline value={data[`subtitle1${s}`]} onChange={v=>set(`subtitle1${s}`,v)} style={{color:"inherit", fontSize:"inherit", lineHeight:"inherit"}}/>
        </p>
        <p style={{ fontSize:14, color:subClr, lineHeight:1.7, margin:"0 0 20px" }}>
          <Editable fieldKey={`subtitle2${s}`} multiline value={data[`subtitle2${s}`]} onChange={v=>set(`subtitle2${s}`,v)} style={{color:"inherit", fontSize:"inherit", lineHeight:"inherit"}}/>
        </p>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
          {[["point1Title","point1"],["point2Title","point2"]].map(([tKey,bKey]) => (
            <div key={tKey} style={{ borderRadius:14, background: dark ? C.dark_input : `${C.IcyBreeze}cc`, border:`1px solid ${dark ? C.dark_border : "#e6e9f5"}`, padding:10 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:C.primary, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:6 }}>
                <CheckCircle2 size={12} color="#fff"/>
              </div>
              <p style={{ fontSize:11, fontWeight:700, color:titleClr, margin:"0 0 2px" }}>
                <Editable fieldKey={`${tKey}${s}`} value={data[`${tKey}${s}`]} onChange={v=>set(`${tKey}${s}`,v)} style={{color:"inherit", fontWeight:"inherit", fontSize:"inherit"}}/>
              </p>
              <p style={{ fontSize:10, color:subClr, lineHeight:1.6, margin:0 }}>
                <Editable fieldKey={`${bKey}${s}`} multiline value={data[`${bKey}${s}`]} onChange={v=>set(`${bKey}${s}`,v)} style={{color:"inherit", fontSize:"inherit", lineHeight:"inherit"}}/>
              </p>
            </div>
          ))}
        </div>

        <p style={{ fontSize:14, fontWeight:600, color:titleClr, margin:"0 0 16px" }}>
          <Editable fieldKey={`cta${s}`} multiline value={data[`cta${s}`]} onChange={v=>set(`cta${s}`,v)} style={{color:"inherit", fontSize:"inherit", fontWeight:"inherit"}}/>
        </p>

        <button style={{ width:"100%", background:C.primary, color:"#fff", border:"none", padding:"13px 20px", borderRadius:14, fontSize:14, fontWeight:700, cursor:"default", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:`0 6px 18px ${C.primary}44` }}>
          <Editable fieldKey={`button${s}`} value={data[`button${s}`]} onChange={v=>set(`button${s}`,v)} style={{color:"#fff", fontWeight:700, fontSize:"inherit"}}/>
          <ArrowIcon size={15}/>
        </button>
      </div>
    </div>
  );
}

/* ════════ MAIN ════════ */
export default function GuestPopupAdminLiveEditor() {
  const [data,           setData]           = useState(DEFAULT);
  const [dark,           setDark]           = useState(false);
  const [pLang,          setPLang]          = useState("ar");
  const [saving,         setSaving]         = useState(false);
  const [toast,          setToast]          = useState(null);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch("/api/section-guest-popup?activeOnly=false");
        const json = await res.json();
        if (json.success && json.data) {
          setData({ ...DEFAULT, ...json.data });
        }
      } catch {
        // يبقى DEFAULT عند الفشل
      }
    };
    load();
  }, []);

  const set = useCallback((field, val) => setData(p => ({ ...p, [field]: val })), []);

  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /* ── رفع صورة الـ stamp ── */
  const uploadStampLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      notify("حجم الصورة يتجاوز 20MB", "err");
      return;
    }

    setUploadingStamp(true);
    try {
      // ── ضغط الصورة أولاً ──
      const compressedDataUrl = await compressImage(file, 400, 0.85);

      // ── تحويل الـ data URL المضغوط لـ Blob ثم File ──
      const blob = await (await fetch(compressedDataUrl)).blob();
      const compressedFile = new File([blob], file.name, { type: blob.type });

      // ── بناء FormData زي ما الـ API الحقيقي محتاج ──
      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("folder", "section-guest-popup");

      const res  = await fetch("/api/upload-image", {
        method: "POST",
        body: formData, // ⚠️ من غير Content-Type — المتصفح بيحطه لوحده مع الـ boundary
      });
      const json = await res.json();

      if (json.success) {
        set("stampLogoUrl", json.imageUrl);
        notify("✓ تم رفع الصورة بنجاح");
      } else {
        notify(json.message || "فشل رفع الصورة", "err");
      }
    } catch (err) {
      notify("✗ خطأ في الاتصال أثناء رفع الصورة", "err");
      console.error("Upload error:", err);
    } finally {
      setUploadingStamp(false);
      e.target.value = "";
    }
  };

  const save = async () => {
    if (data.stampLogoUrl?.startsWith("data:")) {
      notify("صورة الـ Stamp لم تُرفع بعد — انتظر اكتمال الرفع", "err");
      return;
    }

    setSaving(true);
    try {
      const method = data._id ? "PUT" : "POST";
      const url    = data._id ? `/api/section-guest-popup/${data._id}` : "/api/section-guest-popup";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        if (json.data?._id) setData(p => ({ ...p, _id: json.data._id }));
        notify("✓ تم الحفظ بنجاح!");
      } else {
        notify(json.message || "فشل الحفظ", "err");
      }
    } catch {
      notify("✗ خطأ في الاتصال", "err");
    } finally {
      setSaving(false);
    }
  };

  const topBg     = dark ? "#030f1c" : C.MidnightNavy;
  const frameBg   = dark ? "#061525" : "#ece8fd";
  const sidebarBg = dark ? C.darklight : "#ffffff";
  const borderClr = dark ? C.dark_border : C.PowderBlue;
  const mutedClr  = dark ? C.darktext : C.SlateBlue;
  const textClr   = dark ? "#e2e8f0" : C.MidnightNavy;

  const pillStyle = (active) => ({
    display:"flex", alignItems:"center", gap:6,
    padding:"6px 14px", borderRadius:8, cursor:"pointer",
    fontSize:12, fontWeight:500, whiteSpace:"nowrap", transition:"all .15s",
    border:     active ? `0.5px solid rgba(140,82,255,0.35)` : "none",
    background: active ? "rgba(140,82,255,0.1)"              : "transparent",
    color:      active ? C.primary                            : mutedClr,
    boxShadow:  active ? "0 1px 3px rgba(140,82,255,0.12)"   : "none",
  });

  return (
    <div style={{ minHeight:"100vh", background:frameBg, fontFamily:"'Segoe UI',Tahoma,sans-serif", display:"flex", flexDirection:"column" }}>

      {/* TOP BAR */}
      <div style={{ background:topBg, minHeight:58, padding:"12px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 20px rgba(0,0,0,.35)", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${C.primary},${C.amber})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:`0 4px 12px ${C.primary}66` }}>✅</div>
          <div>
            <div style={{ color:"#fff", fontWeight:800, fontSize:15, lineHeight:1.1 }}>Guest Popup Editor</div>
            <div style={{ color:"rgba(255,255,255,.4)", fontSize:10 }}>انقر على أي نص أو صورة للتحرير مباشرة</div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          {toast && (
            <div style={{ background: toast.type==="err" ? "#ef4444" : "#10b981", color:"#fff", padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
              {toast.type==="err" ? <AlertCircle size={14}/> : <CheckCircle size={14}/>}
              {toast.msg}
            </div>
          )}

          <button onClick={()=>set("isActive",!data.isActive)} style={{ background:data.isActive?"#10b98122":"rgba(255,255,255,.1)", border:`1px solid ${data.isActive?"#10b981":"rgba(255,255,255,.2)"}`, borderRadius:8, padding:"7px 13px", cursor:"pointer", color:data.isActive?"#10b981":"rgba(255,255,255,.6)", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            {data.isActive ? <Eye size={14}/> : <EyeOff size={14}/>}
            {data.isActive ? "مفعّل" : "معطّل"}
          </button>

          <button onClick={()=>setDark(d=>!d)} style={{ background:"rgba(255,255,255,.12)", border:"none", borderRadius:8, padding:"7px 13px", cursor:"pointer", color:"#fff", display:"flex", alignItems:"center", gap:6 }}>
            {dark ? <Sun size={15}/> : <Moon size={15}/>}
            <span style={{ fontSize:11, fontWeight:600 }}>{dark ? "Light" : "Dark"}</span>
          </button>

          <button onClick={save} disabled={saving} style={{ background: saving ? "#6b7280" : `linear-gradient(135deg,${C.primary},#7a45e6)`, color:"#fff", border:"none", padding:"9px 22px", borderRadius:10, fontWeight:700, fontSize:13, cursor: saving ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:7, boxShadow: saving ? "none" : `0 4px 14px ${C.primary}55` }}>
            {saving ? <Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> : <Save size={14}/>}
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div style={{ background:sidebarBg, borderBottom:`0.5px solid ${borderClr}`, padding:"10px 20px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", background: dark ? C.dark_input : "#f1f0f5", borderRadius:10, padding:3, gap:2, border:`0.5px solid ${borderClr}` }}>
          {[{id:"ar",flag:"🇸🇦",label:"عربي"},{id:"en",flag:"🇺🇸",label:"English"}].map(({id,flag,label}) => (
            <button key={id} onClick={()=>setPLang(id)} style={pillStyle(pLang===id)}>
              <span style={{fontSize:14}}>{flag}</span> {label}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:"rgba(140,82,255,0.09)", border:"0.5px solid rgba(140,82,255,0.35)", borderRadius:8, fontSize:11, fontWeight:500, color:C.primary, whiteSpace:"nowrap" }}>
          ✏️ {pLang==="ar" ? "انقر على أي نص أو صورة للتحرير" : "Click any text or image to edit"}
        </div>

        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:500, color:mutedClr }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#ef4444", display:"inline-block", animation:"blink 1.4s infinite" }}/>
          Live Preview
        </div>
      </div>

      {/* PREVIEW */}
      <div style={{ flex:1, overflowY:"auto", padding:"28px 24px", display:"flex", justifyContent:"center", alignItems:"flex-start" }}>
        <div style={{ width:"100%", maxWidth:640 }}>
          <div style={{ background: dark ? "#0a0a1a" : C.MidnightNavy, borderRadius:"14px 14px 0 0", padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:11, height:11, borderRadius:"50%", background:"#ff5f57" }}/>
            <div style={{ width:11, height:11, borderRadius:"50%", background:"#febc2e" }}/>
            <div style={{ width:11, height:11, borderRadius:"50%", background:"#28c840" }}/>
            <div style={{ flex:1, marginLeft:10, background:"rgba(255,255,255,.1)", borderRadius:6, padding:"3px 12px", color:"rgba(255,255,255,.5)", fontSize:11 }}>
              🔒 codeschool.com/{pLang} — guest popup
            </div>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{pLang==="ar" ? "RTL ←" : "→ LTR"}</span>
          </div>

          <div style={{ background: dark ? C.darkmode : "#eef1f4", borderRadius:"0 0 14px 14px", padding:"28px 20px", boxShadow:"0 24px 60px rgba(0,0,0,.15)" }}>
            <GuestPopupTemplate
              data={data}
              lang={pLang}
              dark={dark}
              set={set}
              uploadStampLogo={uploadStampLogo}
              uploadingStamp={uploadingStamp}
            />
          </div>

          {/* Extra fields: button link */}
          <div style={{ marginTop:16, padding:"14px 18px", background:sidebarBg, borderRadius:10, border:`0.5px solid ${borderClr}` }}>
            <label style={{ fontSize:11, fontWeight:700, color:mutedClr, display:"block", marginBottom:6 }}>
              رابط الزرار (buttonLink)
            </label>
            <input
              type="text"
              value={data.buttonLink}
              onChange={(e)=>set("buttonLink", e.target.value)}
              placeholder="/portfolio/builder"
              dir="ltr"
              style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:`1px solid ${borderClr}`, background: dark ? C.dark_input : "#fff", color:textClr, fontSize:13, outline:"none" }}
            />
          </div>

          <div style={{ marginTop:12, padding:"12px 18px", background:sidebarBg, borderRadius:10, border:`0.5px solid ${borderClr}`, display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:16 }}>💡</span>
            <span style={{ fontSize:11, color:mutedClr, lineHeight:1.7 }}>
              سجل واحد يحتوي على كل البيانات عربي + إنجليزي. انقر على دائرة الـ stamp لرفع لوجو مخصص — لو مفيش صورة هيرجع للّوجو الافتراضي حسب وضع اللايت/الدارك في الموقع الفعلي.
              {" "}<b style={{color:C.primary}}>حفظ التغييرات</b> يرسل للـ API مباشرة.
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        [contenteditable]:focus { outline:none !important; }
      `}</style>
    </div>
  );
}