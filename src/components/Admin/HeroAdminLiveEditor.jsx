"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Save, Moon, Sun, Upload, Loader2,
  CheckCircle, AlertCircle, Eye, EyeOff,
  GraduationCap, Heart, Star, Gift, Phone, Mail,
  ArrowRight, ArrowLeft, Users, X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

const C = {
  primary:      "#8c52ff",
  LightYellow:  "#FFE15A",
  IcyBreeze:    "#EFFBFF",
  MidnightNavy: "#102D47",
  SlateBlue:    "#547593",
  ElectricAqua: "#46C4FF",
  YellowRating: "#FAB446",
  darkmode:     "#011120",
  darklight:    "#0d1a2c",
  darktext:     "#7F8487",
  dark_border:  "#224767",
  dark_input:   "#1B2430",
  PowderBlue:   "#E1F1F6",
};

const DEFAULT = {
  imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=500&fit=crop",
  secondImageUrl: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=400&h=500&fit=crop",
  imageAlt: "مدرب البرمجة", secondImageAlt: "الصورة الثانية",
  heroTitleAr: "إطلاق طاقة المبدعين الصغار!",
  heroDescriptionAr: "نقدم برامج تعليمية متطورة تساعد الأطفال على تعلم البرمجة بطريقة ممتعة وتفاعلية، مما يفتح لهم آفاقاً جديدة في عالم التكنولوجيا.",
  instructor1Ar: "ياسين عبدالله", instructor1RoleAr: "تعلم الآلة",
  instructor2Ar: "فريدة عبدالله", instructor2RoleAr: "تطوير الويب",
  heroTitleEn: "Empower Young Minds!",
  heroDescriptionEn: "We provide advanced educational programs that help children learn programming in a fun and interactive way.",
  instructor1En: "Yassin Abdullah", instructor1RoleEn: "Machine Learning",
  instructor2En: "Farida Abdullah", instructor2RoleEn: "Web Development",
  welcomeTitleAr: "ارتقِ بعقول الشباب!",
  welcomeSubtitle1Ar: "حوّل مستقبل طفلك مع البرمجة",
  welcomeSubtitle2Ar: "احصل على خصم 30% على جميع الدورات",
  welcomeFeature1Ar: "130 ألف+ خريج", welcomeFeature2Ar: "مدربون خبراء",
  welcomeFeature3Ar: "تعلم تفاعلي",   welcomeFeature4Ar: "لفترة محدودة فقط",
  welcomeFeature5Ar: "جميع الفئات العمرية", welcomeFeature6Ar: "شهادة معتمدة",
  welcomeTitleEn: "Empower Young Minds!",
  welcomeSubtitle1En: "Transform your child's future with coding",
  welcomeSubtitle2En: "Get 30% off on all courses",
  welcomeFeature1En: "130K+ Graduates", welcomeFeature2En: "Expert Trainers",
  welcomeFeature3En: "Interactive Learning", welcomeFeature4En: "Limited Time Only",
  welcomeFeature5En: "All Age Groups", welcomeFeature6En: "Certified Certificate",
  discount: 30, happyParents: "250", graduates: "130",
  isActive: true, displayOrder: 0,
};

/* ── Editable ── */
function Editable({ fieldKey, value, onChange, tag: Tag = "span", multiline = false,
  placeholder = "انقر للتحرير...", style = {} }) {
  const ref       = useRef(null);
  const lastSaved = useRef(value);
  const isFocused = useRef(false);
  const [hov, setHov] = useState(false);
  const [foc, setFoc] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused.current) {
      ref.current.innerText = value ?? "";
      lastSaved.current = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldKey]);

  const onFocus  = () => { isFocused.current = true;  setFoc(true); };
  const onBlur   = () => {
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
        ? <img src={src} alt={alt} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} onError={e=>{e.target.style.opacity=0}}/>
        : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,background:"rgba(255,255,255,.15)" }}>👤</div>
      }
      {(hov || uploading) && (
        <div style={{ position:"absolute",inset:0,background:"rgba(140,82,255,.55)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,backdropFilter:"blur(2px)",borderRadius:"inherit" }}>
          {uploading ? <Loader2 size={22} color="#fff" style={{animation:"spin 1s linear infinite"}}/> : <Upload size={20} color="#fff"/>}
          <span style={{ color:"#fff",fontSize:10,fontWeight:700 }}>{uploading?"جاري الرفع...":"تغيير الصورة"}</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onUpload}/>
    </div>
  );
}

/* ════════ HERO TEMPLATE ════════ */
function HeroTemplate({ data, lang, dark, set, uploadImage, uploading }) {
  const isRTL = lang === "ar";
  const s     = isRTL ? "Ar" : "En";
  const r1    = isRTL ? "0 200px 0 200px" : "200px 0 200px 0";
  const r2    = isRTL ? "200px 0 200px 0" : "0 200px 0 200px";
  const textC = dark ? "#e2e8f0" : C.MidnightNavy;
  const subC  = dark ? C.darktext : C.SlateBlue;
  const desc  = data[`heroDescription${s}`] || "";
  const preview = desc.split(" ").slice(0,36).join(" ") + (desc.split(" ").length > 36 ? "..." : "");

  return (
    <section style={{ background: dark ? C.darkmode : "#fff", padding:"6px 0 8px" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 20px" }}>
        <div style={{ 
          display:"grid", 
          gridTemplateColumns: "repeat(12,1fr)",
          alignItems:"center", 
          gap:30
        }}
          dir={isRTL ? "rtl" : "ltr"}>

          {/* Text col */}
          <div style={{ gridColumn:"span 6" }} className="hero-text-col">
            <p style={{ position:"relative",display:"inline-block",color:C.primary,fontSize:"clamp(14px, 4vw, 18px)",fontWeight:700,zIndex:0,marginBottom:0 }}>
              <span style={{ position:"absolute",bottom:0,left:0,width:"100%",height:8,background:C.primary+"33",zIndex:-1 }}/>
              🗓 {isRTL ? "ويبنار قادم — سجّل الآن" : "Upcoming Webinar — Register Now"}
            </p>

            <h1 style={{ padding:"16px 0",fontSize:"clamp(1.8rem, 5vw, 2.8rem)",fontWeight:800,color:textC,lineHeight:1.22,margin:0 }}>
              <Editable fieldKey={`heroTitle${s}`} tag="span"
                value={data[`heroTitle${s}`]} onChange={v=>set(`heroTitle${s}`,v)}
                style={{ fontSize:"inherit",fontWeight:"inherit",color:"inherit",lineHeight:"inherit" }}/>
            </h1>

            <p style={{ fontSize:"clamp(16px, 4vw, 20px)",color:subC,fontWeight:400,lineHeight:1.75,paddingBottom:56,maxWidth:500,margin:0 }}>
              <Editable fieldKey={`heroDescription${s}`} tag="span" multiline
                value={preview} onChange={v=>set(`heroDescription${s}`,v)}
                style={{ fontSize:"inherit",color:"inherit",lineHeight:"inherit" }}
                placeholder={isRTL ? "أدخل الوصف..." : "Enter description..."}/>
              {" "}
              <span style={{ color:C.primary,fontWeight:600,textDecoration:"underline",cursor:"pointer",fontSize:"clamp(14px, 3.5vw, 18px)" }}>
                {isRTL ? "اقرأ المزيد" : "Read more"}
              </span>
            </p>

            <div style={{ display:"flex",alignItems:"center",gap:16,flexWrap:"wrap" }}>
              <button style={{ display:"inline-flex",alignItems:"center",gap:14,background:C.primary,color:"#fff",border:"2px solid " + C.primary,padding:"clamp(10px, 3vw, 13px) clamp(20px, 5vw, 26px)",borderRadius:8,fontSize:"clamp(13px, 3.5vw, 15px)",fontWeight:700,cursor:"default",boxShadow:"0 4px 18px " + C.primary + "44" }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"/>
                </svg>
                {isRTL ? "تصفح الدورات" : "Browse Courses"}
              </button>
              <button style={{ display:"inline-flex",alignItems:"center",gap:14,background:"transparent",color:C.primary,border:"2px solid " + C.primary,padding:"clamp(10px, 3vw, 13px) clamp(20px, 5vw, 26px)",borderRadius:8,fontSize:"clamp(13px, 3.5vw, 15px)",fontWeight:700,cursor:"default" }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x={3} y={4} width={18} height={18} rx={2} ry={2}/><line x1={16} y1={2} x2={16} y2={6}/><line x1={8} y1={2} x2={8} y2={6}/><line x1={3} y1={10} x2={21} y2={10}/>
                </svg>
                {isRTL ? "شاهد الديمو" : "Watch Demo"}
              </button>
            </div>
          </div>

          {/* Images col */}
          <div style={{ 
            gridColumn:"span 6", 
            display:"flex", 
            alignItems:"center", 
            gap:"clamp(8px, 3vw, 12px)"
          }} dir={isRTL?"rtl":"ltr"} className="hero-images-col">
            <div style={{ position:"relative",flex:1 }}>
              <EditableImage src={data.imageUrl} alt={data.imageAlt}
                uploading={uploading.img1} onUpload={e=>uploadImage(e,false)}
                style={{ width:"100%",height:"clamp(250px, 50vw, 400px)",borderRadius:r1,background:"#ffbd59",overflow:"hidden" }}/>
              {data[`instructor1${s}`] && (
                <div style={{ 
                  position:"absolute", 
                  top:16, 
                  zIndex:50, 
                  [isRTL?"right":"left"]:0, 
                  transform:isRTL?"translateX(33%)":"translateX(-33%)",
                  background:C.primary,
                  borderRadius:16,
                  boxShadow:"0 6px 20px " + C.primary + "55",
                  padding:"clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)"
                }} className="instructor-card">
                  <p style={{ fontSize:"clamp(12px, 3.5vw, 16px)",fontWeight:700,color:"#fff",whiteSpace:"nowrap",margin:0 }}>
                    <Editable fieldKey={`instructor1${s}`} tag="span" value={data[`instructor1${s}`]} onChange={v=>set(`instructor1${s}`,v)} style={{color:"#fff",fontWeight:700,fontSize:"clamp(12px, 3.5vw, 16px)"}}/>
                  </p>
                  <p style={{ fontSize:"clamp(10px, 3vw, 14px)",fontWeight:500,color:"rgba(255,255,255,.9)",textAlign:"center",margin:0 }}>
                    <Editable fieldKey={`instructor1Role${s}`} tag="span" value={data[`instructor1Role${s}`]} onChange={v=>set(`instructor1Role${s}`,v)} style={{color:"rgba(255,255,255,.9)",fontWeight:500,fontSize:"clamp(10px, 3vw, 14px)"}}/>
                  </p>
                </div>
              )}
            </div>

            <div style={{ position:"relative",flex:1 }}>
              <EditableImage src={data.secondImageUrl} alt={data.secondImageAlt}
                uploading={uploading.img2} onUpload={e=>uploadImage(e,true)}
                style={{ 
                  width:"100%",
                  height:"clamp(250px, 50vw, 400px)",
                  borderRadius:r2,
                  marginTop:"clamp(60px, 15vw, 128px)",
                  background:C.primary,
                  overflow:"hidden"
                }}/>
              {data[`instructor2${s}`] && (
                <div style={{ 
                  position:"absolute", 
                  top:"clamp(180px, 35vw, 272px)",
                  zIndex:50,
                  [isRTL?"left":"right"]:0,
                  transform:isRTL?"translateX(-33%)":"translateX(33%)",
                  background:"#ffbd59",
                  borderRadius:16,
                  boxShadow:"0 6px 20px #ffbd5966",
                  padding:"clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)"
                }} className="instructor-card-2">
                  <p style={{ fontSize:"clamp(12px, 3.5vw, 16px)",fontWeight:700,color:"#fff",whiteSpace:"nowrap",margin:0 }}>
                    <Editable fieldKey={`instructor2${s}`} tag="span" value={data[`instructor2${s}`]} onChange={v=>set(`instructor2${s}`,v)} style={{color:"#fff",fontWeight:700,fontSize:"clamp(12px, 3.5vw, 16px)"}}/>
                  </p>
                  <p style={{ fontSize:"clamp(10px, 3vw, 14px)",fontWeight:500,color:"rgba(255,255,255,.9)",textAlign:"center",margin:0 }}>
                    <Editable fieldKey={`instructor2Role${s}`} tag="span" value={data[`instructor2Role${s}`]} onChange={v=>set(`instructor2Role${s}`,v)} style={{color:"rgba(255,255,255,.9)",fontWeight:500,fontSize:"clamp(10px, 3vw, 14px)"}}/>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          .hero-text-col {
            grid-column: span 12 !important;
            text-align: ${isRTL ? 'right' : 'left'} !important;
          }
          .hero-images-col {
            grid-column: span 12 !important;
          }
          .instructor-card {
            transform: ${isRTL ? 'translateX(20%)' : 'translateX(-20%)'} !important;
          }
          .instructor-card-2 {
            transform: ${isRTL ? 'translateX(-20%)' : 'translateX(20%)'} !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ════════ POPUP TEMPLATE ════════ */
function PopupTemplate({ data, lang, dark, set, uploadImage, uploading }) {
  const isRTL   = lang === "ar";
  const s       = isRTL ? "Ar" : "En";
  const [slide, setSlide] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setSlide(p => (p+1)%2), 4500);
    return () => clearInterval(timerRef.current);
  }, []);

  const panelBg  = dark ? C.darklight  : C.IcyBreeze;
  const titleClr = dark ? "#f1f5f9"    : C.MidnightNavy;
  const subClr   = dark ? C.darktext   : C.SlateBlue;
  const divLine  = dark ? C.dark_border : "#e2e8f0";
  const slideImg = slide === 0 ? data.imageUrl : (data.secondImageUrl || data.imageUrl);
  const SlideIcon = slide === 0 ? GraduationCap : Heart;
  const fKeys    = [0,1,2].map(i => `welcomeFeature${slide*3+i+1}${s}`);
  const subKey   = slide === 0 ? `welcomeSubtitle1${s}` : `welcomeSubtitle2${s}`;

  return (
    <div dir={isRTL?"rtl":"ltr"} style={{ 
      display:"flex", 
      flexDirection:"column",
      borderRadius:22,
      overflow:"hidden",
      boxShadow:dark?"0 24px 64px rgba(0,0,0,.5)":"0 24px 64px rgba(0,0,0,.14)",
      minHeight:"clamp(500px, 80vh, 650px)",
      position:"relative",
      background:panelBg
    }} className="popup-container">
      <div style={{ 
        position:"absolute",
        top:10,
        [isRTL?"left":"right"]:10,
        zIndex:20,
        width:36,
        height:36,
        borderRadius:"50%",
        background:dark?"rgba(255,255,255,.1)":"rgba(255,255,255,.9)",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        boxShadow:"0 2px 8px rgba(0,0,0,.15)",
        cursor:"pointer"
      }}>
        <X size={16} color={C.SlateBlue}/>
      </div>

      {/* Left panel */}
      <div style={{ 
        width:"100%",
        background:`linear-gradient(135deg,${C.primary} 0%,#7a45e6 50%,#6a3ac9 100%)`,
        padding:"clamp(20px, 5vw, 32px) clamp(16px, 4vw, 20px)",
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        justifyContent:"center",
        position:"relative",
        overflow:"hidden",
        minHeight:"clamp(400px, 60vh, 500px)"
      }} className="popup-left">
        {[["18%","10%"],["80%","32%"],["22%","70%"],["84%","76%"],["52%","18%"],["68%","58%"]].map(([l,t],i)=>(
          <div key={i} style={{ position:"absolute",left:l,top:t,color:"rgba(255,255,255,.4)",fontSize:12,pointerEvents:"none",animation:`sparkle ${3.2+i*.35}s ease-in-out infinite`,animationDelay:`${i*.28}s` }}>✦</div>
        ))}
        <div style={{ 
          background:"rgba(255,255,255,.2)",
          backdropFilter:"blur(8px)",
          borderRadius:"50%",
          width:"clamp(50px, 12vw, 64px)",
          height:"clamp(50px, 12vw, 64px)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          marginBottom:16,
          boxShadow:"0 4px 16px rgba(0,0,0,.15)"
        }}>
          <SlideIcon size={32} color="#fff"/>
        </div>
        <div style={{ 
          background:"rgba(255,255,255,.1)",
          backdropFilter:"blur(8px)",
          borderRadius:22,
          overflow:"hidden",
          width:"clamp(120px, 30vw, 160px)",
          height:"clamp(120px, 30vw, 160px)",
          marginBottom:20,
          border:"1px solid rgba(255,255,255,.25)",
          padding:12
        }}>
          <EditableImage src={slideImg} alt={data.imageAlt}
            uploading={slide===0?uploading.img1:uploading.img2}
            onUpload={e=>uploadImage(e,slide!==0)}
            style={{ width:"100%",height:"100%",borderRadius:14 }}/>
        </div>
        <div style={{ width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:10 }}>
          {fKeys.map((key,i)=>(
            <div key={key} style={{ 
              display:"flex",
              alignItems:"center",
              gap:12,
              background:"rgba(255,255,255,.2)",
              backdropFilter:"blur(4px)",
              borderRadius:14,
              padding:"clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
              border:"1px solid rgba(255,255,255,.3)",
              direction:isRTL?"rtl":"ltr"
            }}>
              <div style={{ background:"rgba(255,255,255,.3)",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <Star size={13} color={C.LightYellow} fill={C.LightYellow}/>
              </div>
              <Editable fieldKey={key} tag="span" value={data[key]} onChange={v=>set(key,v)}
                style={{ color:"#fff",fontSize:"clamp(12px, 3vw, 14px)",fontWeight:600,flex:1 }}
                placeholder={isRTL?`ميزة ${i+1}`:`Feature ${i+1}`}/>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",gap:8,marginTop:20 }}>
          {[0,1].map(i=>(
            <button key={i} onClick={()=>{setSlide(i);clearInterval(timerRef.current);}}
              style={{ width:slide===i?32:10,height:10,borderRadius:5,background:slide===i?C.LightYellow:"rgba(255,255,255,.45)",border:"none",cursor:"pointer",transition:"all .35s",padding:0,boxShadow:slide===i?"0 2px 8px rgba(0,0,0,.2)":"none" }}/>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ 
        flex:1,
        padding:"clamp(24px, 6vw, 32px) clamp(20px, 5vw, 28px)",
        background:panelBg,
        display:"flex",
        flexDirection:"column",
        justifyContent:"center",
        textAlign:isRTL?"right":"left",
        overflowY:"auto"
      }} className="popup-right">
        <h2 style={{ fontSize:"clamp(1.3rem, 5vw, 2.5rem)",fontWeight:700,color:titleClr,lineHeight:1.25,margin:"0 0 12px" }}>
          {slide===0
            ? <Editable fieldKey={`welcomeTitle${s}`} tag="span" value={data[`welcomeTitle${s}`]} onChange={v=>set(`welcomeTitle${s}`,v)} style={{color:titleClr,fontWeight:"inherit",fontSize:"inherit"}}/>
            : <span>{isRTL?"عرض خاص!":"Special Offer!"}</span>
          }
        </h2>
        <p style={{ fontSize:"clamp(14px, 4vw, 17px)",color:subClr,lineHeight:1.7,margin:"0 0 16px" }}>
          <Editable fieldKey={subKey} tag="span" multiline value={data[subKey]} onChange={v=>set(subKey,v)}
            style={{color:subClr,fontSize:"inherit",lineHeight:"inherit"}}
            placeholder={isRTL?"أدخل العنوان الفرعي...":"Enter subtitle..."}/>
        </p>
        {slide===1&&(
          <div style={{ 
            background:`linear-gradient(90deg,${C.primary},#ffbd59)`,
            color:"#fff",
            borderRadius:14,
            padding:"clamp(10px, 3vw, 12px) clamp(12px, 4vw, 16px)",
            display:"flex",
            alignItems:"center",
            gap:16,
            marginBottom:16,
            boxShadow:"0 6px 20px " + C.primary + "44",
            flexWrap:"wrap"
          }}>
            <div style={{ background:"rgba(255,255,255,.2)",borderRadius:"50%",width:"clamp(40px, 10vw, 44px)",height:"clamp(40px, 10vw, 44px)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <Gift size={22} color="#fff"/>
            </div>
            <div>
              <div style={{ fontWeight:700,fontSize:"clamp(20px, 6vw, 24px)",display:"flex",alignItems:"center",gap:4,flexWrap:"wrap" }}>
                <Editable fieldKey="discount" tag="span" value={String(data.discount)} onChange={v=>set("discount",parseInt(v)||0)} style={{color:"#fff",fontWeight:700,fontSize:"clamp(20px, 6vw, 24px)",minWidth:32}}/>
                <span>% OFF</span>
              </div>
              <div style={{ fontSize:"clamp(11px, 3vw, 13px)",opacity:.9 }}>{isRTL?"عرض لفترة محدودة":"Limited Time Offer"}</div>
            </div>
          </div>
        )}
        <h3 style={{ fontSize:"clamp(16px, 4.5vw, 20px)",fontWeight:600,color:titleClr,margin:"0 0 16px" }}>
          {isRTL?"ابدأ رحلة طفلك اليوم!":"Start Your Child's Journey Today!"}
        </h3>
        <button style={{ 
          width:"100%",
          background:"#25D366",
          color:"#fff",
          border:"none",
          borderRadius:14,
          padding:"clamp(12px, 3vw, 14px) clamp(16px, 4vw, 20px)",
          fontSize:"clamp(13px, 3.5vw, 15px)",
          fontWeight:600,
          marginBottom:12,
          cursor:"default",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          gap:12,
          boxShadow:"0 4px 14px #25D36644"
        }}>
          <FaWhatsapp size={22}/>
          <span>{isRTL?"استشارة مجانية على واتساب":"Free Consultation on WhatsApp"}</span>
          {isRTL?<ArrowLeft size={16}/>:<ArrowRight size={16}/>}
        </button>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"clamp(8px, 2vw, 12px)",marginBottom:24 }}>
          <button style={{ 
            background:C.ElectricAqua,
            color:"#fff",
            border:"none",
            borderRadius:14,
            padding:"clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
            fontSize:"clamp(12px, 3vw, 14px)",
            fontWeight:600,
            cursor:"default",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            gap:8,
            boxShadow:"0 4px 12px " + C.ElectricAqua + "44"
          }}>
            <Phone size={17}/> {isRTL?"اتصل الآن":"Call Now"}
          </button>
          <button style={{ 
            background:C.primary,
            color:"#fff",
            border:"none",
            borderRadius:14,
            padding:"clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px)",
            fontSize:"clamp(12px, 3vw, 14px)",
            fontWeight:600,
            cursor:"default",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            gap:8,
            boxShadow:"0 4px 12px " + C.primary + "44"
          }}>
            <Mail size={17}/> {isRTL?"راسلنا عبر الإيميل":"Email Us"}
          </button>
        </div>
        <div style={{ 
          paddingTop:20,
          borderTop:"1px solid " + divLine,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          gap:"clamp(12px, 3vw, 16px)",
          flexWrap:"wrap"
        }}>
          <div style={{ display:"flex",alignItems:"center",gap:4 }}>
            {[...Array(5)].map((_,i)=><Star key={i} size={15} color={C.YellowRating} fill={C.YellowRating}/>)}
            <span style={{ fontWeight:600,fontSize:"clamp(12px, 3vw, 14px)",color:titleClr,marginLeft:6 }}>4.9/5</span>
          </div>
          <span style={{ color:divLine,fontSize:16 }}>•</span>
          <div style={{ fontSize:"clamp(12px, 3vw, 14px)",color:subClr,display:"flex",alignItems:"center",gap:6 }}>
            <Users size={16} color={C.primary}/>
            <Editable fieldKey="happyParents" tag="span" value={data.happyParents} onChange={v=>set("happyParents",v)} style={{color:subClr,fontSize:"clamp(12px, 3vw, 14px)",fontWeight:600}}/>
            <span>{isRTL?" أولياء أمور راضون":" Happy Parents"}</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (min-width: 768px) {
          .popup-container {
            flex-direction: ${isRTL ? 'row-reverse' : 'row'} !important;
          }
          .popup-left {
            width: 42% !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ════════ MAIN ════════ */
export default function HeroAdminLiveEditor() {
  const [data,      setData]      = useState(DEFAULT);
  const [dark,      setDark]      = useState(false);
  const [pLang,     setPLang]     = useState("ar");
  const [pMode,     setPMode]     = useState("hero");
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [uploading, setUploading] = useState({ img1:false, img2:false });

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch("/api/section-images-hero?activeOnly=false");
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          setData(prev => ({ ...DEFAULT, ...json.data[0] }));
        }
      } catch { /* يبقى الـ DEFAULT */ }
    };
    load();
  }, []);

  const set = useCallback((field, val) => setData(p => ({ ...p, [field]: val })), []);

  const notify = (msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const uploadImage = async (e, isSecond) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { notify("حجم الصورة > 5MB","err"); return; }
    const key = isSecond ? "img2" : "img1";
    setUploading(u => ({ ...u, [key]:true }));
    const reader = new FileReader();
    reader.onload = async ev => {
      const b64 = ev.target.result;
      try {
        const res  = await fetch("/api/upload-image", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ image:b64, folder:"section-images-hero" }),
        });
        const json = await res.json();
        set(isSecond?"secondImageUrl":"imageUrl", json.success?json.imageUrl:b64);
        if (json.success) notify("✓ تم رفع الصورة بنجاح");
      } catch { set(isSecond?"secondImageUrl":"imageUrl", b64); }
      finally { setUploading(u => ({ ...u, [key]:false })); }
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!data.imageUrl) { notify("رابط الصورة الأولى مطلوب","err"); return; }
    setSaving(true);
    try {
      const method = data._id ? "PUT" : "POST";
      const url    = data._id ? `/api/section-images-hero/${data._id}` : "/api/section-images-hero";
      const res    = await fetch(url, {
        method, headers:{"Content-Type":"application/json"},
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data?._id) setData(p => ({ ...p, _id:json.data._id }));
        notify("✓ تم الحفظ بنجاح!");
      } else {
        notify(json.message || "فشل الحفظ","err");
      }
    } catch { notify("✗ خطأ في الاتصال","err"); }
    finally { setSaving(false); }
  };

  /* ── theme ── */
  const topBg     = dark ? "#030f1c"   : C.MidnightNavy;
  const frameBg   = dark ? "#061525"   : "#ece8fd";
  const sidebarBg = dark ? C.darklight : "#ffffff";
  const borderClr = dark ? C.dark_border : C.PowderBlue;
  const mutedClr  = dark ? C.darktext   : C.SlateBlue;
  const textClr   = dark ? "#e2e8f0"    : C.MidnightNavy;

  /* ── pill style helper ── */
  const pillStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "clamp(4px, 1.5vw, 6px) clamp(10px, 3vw, 14px)", borderRadius: 8, cursor: "pointer",
    fontSize: "clamp(11px, 3vw, 12px)", fontWeight: 500, whiteSpace: "nowrap",
    transition: "all .15s",
    border:      active ? `0.5px solid rgba(140,82,255,0.35)` : "none",
    background:  active ? "rgba(140,82,255,0.1)"              : "transparent",
    color:       active ? C.primary                            : mutedClr,
    boxShadow:   active ? "0 1px 3px rgba(140,82,255,0.12)"   : "none",
  });

  return (
    <div style={{ minHeight:"100vh", background:frameBg, fontFamily:"'Segoe UI',Tahoma,sans-serif", display:"flex", flexDirection:"column" }}>

      {/* ══ TOP BAR ══ */}
      <div style={{ 
        background:topBg, 
        minHeight:58,
        padding:"clamp(8px, 2vw, 12px) clamp(16px, 4vw, 22px)",
        display:"flex", 
        alignItems:"center", 
        justifyContent:"space-between", 
        position:"sticky", 
        top:0, 
        zIndex:100, 
        boxShadow:"0 2px 20px rgba(0,0,0,.35)", 
        flexShrink:0,
        flexWrap:"wrap",
        gap:"10px"
      }}>
        <div style={{ display:"flex",alignItems:"center",gap:"clamp(8px, 2vw, 12px)" }}>
          <div style={{ 
            width:"clamp(32px, 8vw, 36px)",
            height:"clamp(32px, 8vw, 36px)",
            borderRadius:10,
            background:`linear-gradient(135deg,${C.primary},#ffbd59)`,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            fontSize:"clamp(16px, 4vw, 18px)",
            boxShadow:`0 4px 12px ${C.primary}66`
          }}>⚡</div>
          <div>
            <div style={{ color:"#fff",fontWeight:800,fontSize:"clamp(13px, 3.5vw, 15px)",lineHeight:1.1 }}>Hero Live Editor</div>
            <div style={{ color:"rgba(255,255,255,.4)",fontSize:"clamp(8px, 2.5vw, 10px)" }}>انقر على أي نص أو صورة للتحرير مباشرة</div>
          </div>
        </div>

        <div style={{ display:"flex",alignItems:"center",gap:"clamp(8px, 2vw, 10px)",flexWrap:"wrap" }}>
          {toast && (
            <div style={{ 
              background:toast.type==="err"?"#ef4444":"#10b981",
              color:"#fff",
              padding:"clamp(4px, 1.5vw, 6px) clamp(10px, 3vw, 14px)",
              borderRadius:8,
              fontSize:"clamp(10px, 2.5vw, 12px)",
              fontWeight:600,
              animation:"slideIn .25s ease",
              display:"flex",
              alignItems:"center",
              gap:6
            }}>
              {toast.type==="err"?<AlertCircle size={14}/>:<CheckCircle size={14}/>}
              {toast.msg}
            </div>
          )}
          <button onClick={()=>set("isActive",!data.isActive)} style={{ 
            background:data.isActive?"#10b98122":"rgba(255,255,255,.1)",
            border:`1px solid ${data.isActive?"#10b981":"rgba(255,255,255,.2)"}`,
            borderRadius:8,
            padding:"clamp(5px, 1.8vw, 7px) clamp(10px, 3vw, 13px)",
            cursor:"pointer",
            color:data.isActive?"#10b981":"rgba(255,255,255,.6)",
            fontSize:"clamp(10px, 2.5vw, 12px)",
            fontWeight:700,
            display:"flex",
            alignItems:"center",
            gap:6
          }}>
            {data.isActive?<Eye size={14}/>:<EyeOff size={14}/>}
            {data.isActive?"مفعّل":"معطّل"}
          </button>
          <button onClick={()=>setDark(d=>!d)} style={{ 
            background:"rgba(255,255,255,.12)",
            border:"none",
            borderRadius:8,
            padding:"clamp(5px, 1.8vw, 7px) clamp(10px, 3vw, 13px)",
            cursor:"pointer",
            color:"#fff",
            display:"flex",
            alignItems:"center",
            gap:6
          }}>
            {dark?<Sun size={15}/>:<Moon size={15}/>}
            <span style={{ fontSize:"clamp(10px, 2.5vw, 11px)",fontWeight:600 }}>{dark?"Light":"Dark"}</span>
          </button>
          <button onClick={save} disabled={saving} style={{ 
            background:saving?"#6b7280":`linear-gradient(135deg,${C.primary},#7a45e6)`,
            color:"#fff",
            border:"none",
            padding:"clamp(7px, 2vw, 9px) clamp(16px, 5vw, 22px)",
            borderRadius:10,
            fontWeight:700,
            fontSize:"clamp(11px, 3vw, 13px)",
            cursor:saving?"not-allowed":"pointer",
            display:"flex",
            alignItems:"center",
            gap:7,
            boxShadow:saving?"none":`0 4px 14px ${C.primary}55`
          }}>
            {saving?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<Save size={14}/>}
            {saving?"جاري الحفظ...":"حفظ التغييرات"}
          </button>
        </div>
      </div>

      {/* ══ CONTROLS BAR ══ */}
      <div style={{ 
        background:sidebarBg,
        borderBottom:`0.5px solid ${borderClr}`,
        padding:"clamp(8px, 2vw, 10px) clamp(16px, 4vw, 20px)",
        display:"flex",
        alignItems:"center",
        gap:"clamp(8px, 2vw, 10px)",
        flexWrap:"wrap",
        flexShrink:0
      }}>

        {/* Mode pills */}
        <div style={{ 
          display:"flex",
          alignItems:"center",
          background:dark?C.dark_input:"#f1f0f5",
          borderRadius:10,
          padding:3,
          gap:2,
          border:`0.5px solid ${borderClr}`,
          flexWrap:"wrap"
        }}>
          {[
            { id:"hero",  label:"Hero",
              icon:<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
            { id:"popup", label:"Popup",
              icon:<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg> },
          ].map(({ id, label, icon }) => (
            <button key={id} onClick={()=>setPMode(id)} style={pillStyle(pMode===id)}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Lang pills */}
        <div style={{ 
          display:"flex",
          alignItems:"center",
          background:dark?C.dark_input:"#f1f0f5",
          borderRadius:10,
          padding:3,
          gap:2,
          border:`0.5px solid ${borderClr}`,
          flexWrap:"wrap"
        }}>
          {[
            { id:"ar", flag:"🇸🇦", label:"عربي" },
            { id:"en", flag:"🇺🇸", label:"English" },
          ].map(({ id, flag, label }) => (
            <button key={id} onClick={()=>setPLang(id)} style={pillStyle(pLang===id)}>
              <span style={{fontSize:"clamp(12px, 3.5vw, 14px)"}}>{flag}</span> {label}
            </button>
          ))}
        </div>

        {/* Edit hint chip */}
        <div style={{ 
          display:"flex",
          alignItems:"center",
          gap:6,
          padding:"clamp(4px, 1.5vw, 6px) clamp(8px, 2.5vw, 12px)",
          background:"rgba(140,82,255,0.09)",
          border:"0.5px solid rgba(140,82,255,0.35)",
          borderRadius:8,
          fontSize:"clamp(10px, 2.5vw, 11px)",
          fontWeight:500,
          color:C.primary,
          whiteSpace:"nowrap"
        }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          {pLang==="ar" ? "انقر على أي نص أو صورة للتحرير" : "Click any text or image to edit"}
        </div>

        {/* Live badge */}
        <div style={{ 
          marginLeft:"auto",
          display:"flex",
          alignItems:"center",
          gap:6,
          fontSize:"clamp(10px, 2.5vw, 11px)",
          fontWeight:500,
          color:mutedClr,
          whiteSpace:"nowrap"
        }}>
          <span style={{ width:7,height:7,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"blink 1.4s infinite" }}/>
          Live Preview
        </div>
      </div>

      {/* ══ PREVIEW AREA ══ */}
      <div style={{ 
        flex:1,
        overflowY:"auto",
        padding:"clamp(20px, 5vw, 28px) clamp(16px, 4vw, 32px)",
        display:"flex",
        justifyContent:"center",
        alignItems:"flex-start"
      }}>
        <div style={{ width:"100%", maxWidth:"1400px", margin:"0 auto" }}>
          <div style={{ 
            background:dark?"#0a0a1a":C.MidnightNavy,
            borderRadius:"14px 14px 0 0",
            padding:"clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
            display:"flex",
            alignItems:"center",
            gap:8,
            flexWrap:"wrap"
          }}>
            <div style={{ width:11,height:11,borderRadius:"50%",background:"#ff5f57" }}/>
            <div style={{ width:11,height:11,borderRadius:"50%",background:"#febc2e" }}/>
            <div style={{ width:11,height:11,borderRadius:"50%",background:"#28c840" }}/>
            <div style={{ 
              flex:1,
              marginLeft:10,
              background:"rgba(255,255,255,.1)",
              borderRadius:6,
              padding:"3px 12px",
              color:"rgba(255,255,255,.5)",
              fontSize:"clamp(9px, 2.5vw, 11px)",
              overflow:"hidden",
              textOverflow:"ellipsis",
              whiteSpace:"nowrap"
            }}>
              🔒 codeschool.com/{pLang}{pMode==="popup"?"/welcome":""}
            </div>
            <span style={{ fontSize:"clamp(9px, 2.5vw, 11px)",color:"rgba(255,255,255,.3)" }}>{pLang==="ar"?"RTL ←":"→ LTR"}</span>
          </div>

          <div style={{ 
            background:dark?C.darkmode:"#fff",
            borderRadius:"0 0 14px 14px",
            overflow:"visible",
            boxShadow:"0 24px 60px rgba(0,0,0,.15)",
            padding:pMode==="popup"?"clamp(20px, 5vw, 28px) clamp(16px, 4vw, 24px)":0
          }}>
            {pMode==="hero"
              ? <HeroTemplate  data={data} lang={pLang} dark={dark} set={set} uploadImage={uploadImage} uploading={uploading}/>
              : <PopupTemplate data={data} lang={pLang} dark={dark} set={set} uploadImage={uploadImage} uploading={uploading}/>
            }
          </div>

          <div style={{ 
            marginTop:16,
            padding:"clamp(10px, 2.5vw, 12px) clamp(14px, 3.5vw, 18px)",
            background:sidebarBg,
            borderRadius:10,
            border:`0.5px solid ${borderClr}`,
            display:"flex",
            gap:"clamp(8px, 2vw, 10px)",
            alignItems:"center",
            flexWrap:"wrap"
          }}>
            <span style={{ fontSize:"clamp(14px, 3.5vw, 16px)" }}>💡</span>
            <span style={{ fontSize:"clamp(10px, 2.5vw, 11px)",color:mutedClr,lineHeight:1.7 }}>
              سجل واحد يحتوي على كل البيانات عربي + إنجليزي. الصورتان مشتركتان بين <b style={{color:textClr}}>Hero</b> و<b style={{color:textClr}}>Popup</b>.
              {" "}<b style={{color:C.primary}}>حفظ التغييرات</b> يرسل للـ API مباشرة.
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }
        @keyframes sparkle { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:.65;transform:scale(1.35)} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:.25} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#8c52ff44;border-radius:3px; }
        [contenteditable]:focus { outline:none !important; }
        
        @media (max-width: 768px) {
          .hero-text-col {
            grid-column: span 12 !important;
          }
          .hero-images-col {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </div>
  );
}