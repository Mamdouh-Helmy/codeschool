// /src/app/utils/certificateHtml.js
//
// ✅ شهادة بتصميم مطابق للـ reference بتاع العميل (بورتريه 3:4، 1200×1600).
//
// 🔧 التعديلات الأخيرة (مطابقة الـ reference):
//    1. الصور (اللوجو / الشارة / شعارات الشركاء) كان فيها هوامش شفافة/بيضا كبيرة
//       جوّه الملف نفسه فكانت بتظهر صغيرة جدًا. دلوقتي سكريبت صغير جوه الصفحة
//       بيقص الهوامش دي أوتوماتيك (Auto-trim) قبل اللقطة — فبيشتغل مع أي صورة
//       الأدمن يرفعها مستقبلًا، من غير ما نعدّل الملفات.
//    2. الشارة بتبدأ من حافة الصورة العليا (الشريط بيعدّي فوق اللوح الأبيض).
//    3. عنوان CERTIFICATE أكبر، والمسافات بين العناصر اتظبطت زي الـ reference.
//    4. الأرقام بقت Lining (مش old-style) عشان "Module 1" متظهرش "Module ı".
//    5. اللوح الأبيض نازل أكتر لتحت (margin سفلي أصغر) زي الـ reference.
//
// ✅ الكابشن (certificateCaption من الموديول) هو النص الوحيد في المنتصف:
//    - بيدعم أكتر من سطر، و **bold** لأي جزء.
//    - Auto-fit: لو طويل الخط بيصغر لحد ما يتسع فمفيش حاجة بتخرج برا اللوح.
//
// ✅ الـ Auto-fit والـ Auto-trim بيتموا بسكريبت جوه الـ HTML نفسه، فبيشتغلوا
//    بنفس الشكل في معاينة الأدمن (iframe) وفي Puppeteer. الكرون بيستنى
//    window.__certReady قبل أخذ اللقطة (شوف cron/certificates/route.js).
//
// لو غيّرت التصميم هنا، لا تنسى CERT_DESIGN_FALLBACK_HEIGHT في
// CertificatesAdmin.tsx (لازم يفضل = CANVAS_HEIGHT).

import fs from "fs";
import path from "path";

// ─── Layout constants (عدّل من هنا لو عايز تظبط حاجة) ─────────────────────────
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1600;
const PANEL_MARGIN_X = 56; // يمين/شمال
const PANEL_MARGIN_TOP = 58;
const PANEL_MARGIN_BOTTOM = 32; // أصغر من فوق زي الـ reference
const PANEL_PADDING_X = 100;
const PANEL_PADDING_TOP = 194; // بيحدد مكان اللوجو (أول عنصر في اللوح)
const PANEL_PADDING_BOTTOM = 90; // لازم > 46 (الإطار الداخلي) عشان الفوتر ميلزقش في الإطار

// الشارة: بتتحط بالنسبة لحافة الصورة كلها (مش اللوح). بعد الـ trim بتبدأ من top:0
const BADGE_BOX = { top: 0, left: 168, width: 224 };

const LOGO_HEIGHT = 125; // ارتفاع اللوجو الفعلي بعد قص الهوامش
const PARTNER_HEIGHT = 80;
const PARTNER_MAX_WIDTH = 160;

// المساحة المخصصة للكابشن + حدود حجم الخط
const CAPTION_BOX = {
  width: CANVAS_WIDTH - PANEL_MARGIN_X * 2 - PANEL_PADDING_X * 2, // 888
  height: 340,
};
const CAPTION_MAX_FONT = 34;
const CAPTION_MIN_FONT = 14;
const CAPTION_LINE_HEIGHT = 1.8;

// اسم الطالب: بيصغر لو طويل عشان يفضل سطر واحد
const NAME_MAX_FONT = 50;
const NAME_MIN_FONT = 28;

const BACKGROUND_THEMES = {
  "navy-orange": {
    outerBg: "#0c374e",
    accentColor: "#f2561d",
    stripeColor: "#124863",
  },
  "blue-orange": {
    outerBg: "#1c4e80",
    accentColor: "#ff6a00",
    stripeColor: "#2a5f94",
  },
  "gold-teal": {
    outerBg: "#d4a017",
    accentColor: "#0f6b6b",
    stripeColor: "#c99310",
  },
  "orange-teal": {
    outerBg: "#c9531e",
    accentColor: "#0f6b6b",
    stripeColor: "#b3481a",
  },
  "teal-gold": {
    outerBg: "#0f6b6b",
    accentColor: "#d4a017",
    stripeColor: "#0c5757",
  },
  "navy-gold": {
    outerBg: "#0d2b3e",
    accentColor: "#d4a017",
    stripeColor: "#123a52",
  },
};

// قطع الخلفية القُطرية — بتظهر بس في الهوامش حوالين اللوح الأبيض
// (x, y = مركز القطعة، length/thickness بالبكسل)
const STRIPES = [
  { x: 884, y: 22, length: 360, thickness: 58 }, // أعلى يمين
  { x: 8, y: 612, length: 300, thickness: 52 }, // يسار (1)
  { x: 10, y: 1392, length: 300, thickness: 52 }, // يسار (2)
  { x: 1192, y: 790, length: 300, thickness: 52 }, // يمين (1)
  { x: 1190, y: 1050, length: 300, thickness: 52 }, // يمين (2)
  { x: 762, y: 1590, length: 340, thickness: 56 }, // أسفل
];

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

// ─── Images / fonts → data URIs ──────────────────────────────────────────────

// ✅ Cache في الميموري عشان منقراش نفس الملف المحلي من الديسك في كل طلب.
const imageDataUriCache = {};

function imageToDataUri(imageName) {
  if (imageDataUriCache[imageName]) return imageDataUriCache[imageName];

  try {
    const filePath = path.join(process.cwd(), "public", "images", imageName);
    const ext = path.extname(imageName).toLowerCase();
    const mime = MIME_TYPES[ext] || "image/png";
    const fileBuffer = fs.readFileSync(filePath);
    const dataUri = `data:${mime};base64,${fileBuffer.toString("base64")}`;
    imageDataUriCache[imageName] = dataUri;
    return dataUri;
  } catch (err) {
    console.error(`⚠️ Could not read image for certificate: ${imageName}`, err.message);
    return "";
  }
}

// ✅ Cache للصور المرفوعة من الأدمن (URL -> data URI). المفتاح هو رابط
// Cloudinary نفسه، فلو الأدمن رفع صورة جديدة هيبقى ليها رابط مختلف تلقائي.
const remoteImageCache = {};

async function remoteImageToDataUri(url) {
  if (!url) return null;
  if (remoteImageCache[url]) return remoteImageCache[url];

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());
    const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
    remoteImageCache[url] = dataUri;
    return dataUri;
  } catch (err) {
    console.error(`⚠️ Could not fetch custom certificate asset: ${url}`, err.message);
    return null;
  }
}

// ✅ الصورة المخصصة (لو موجودة) وإلا الصورة المحلية الافتراضية.
async function resolveAsset(customUrl, defaultFileName) {
  if (customUrl) {
    const dataUri = await remoteImageToDataUri(customUrl);
    if (dataUri) return dataUri;
  }
  return imageToDataUri(defaultFileName);
}

const fontDataUriCache = {};

function fontToDataUri(fontFileName) {
  if (fontDataUriCache[fontFileName]) return fontDataUriCache[fontFileName];

  try {
    const filePath = path.join(process.cwd(), "public", "fonts", "certificate", fontFileName);
    const fileBuffer = fs.readFileSync(filePath);
    const dataUri = `data:font/woff2;base64,${fileBuffer.toString("base64")}`;
    fontDataUriCache[fontFileName] = dataUri;
    return dataUri;
  } catch (err) {
    console.error(`⚠️ Could not read font for certificate: ${fontFileName}`, err.message);
    return "";
  }
}

// ─── Text helpers ────────────────────────────────────────────────────────────

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ✅ الكابشن: أكتر من سطر + **bold**. بنعمل escape الأول (أمان) وبعدين
// نحوّل الماركداون البسيط، فمفيش أي HTML من المستخدم بيتنفذ.
function captionToHtml(str = "") {
  return escapeHtml(String(str).trim())
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\r?\n/g, "<br/>");
}

// ✅ تقدير أولي لحجم الخط (Baseline) من السيرفر — بيشتغل حتى لو السكريبت
// ماشتغلش. السكريبت جوه الصفحة هو اللي بيعمل الضبط الدقيق بعد تحميل الخطوط.
function estimateCaptionFontSize(caption = "") {
  const lines = String(caption).replace(/\*\*/g, "").split(/\r?\n/);
  const AVG_CHAR_EM = 0.42; // تقدير متحفظ لـ Cormorant Garamond

  for (let size = CAPTION_MAX_FONT; size > CAPTION_MIN_FONT; size--) {
    const charsPerLine = Math.max(1, Math.floor(CAPTION_BOX.width / (size * AVG_CHAR_EM)));
    const totalLines = lines.reduce(
      (sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)),
      0
    );
    if (totalLines * size * CAPTION_LINE_HEIGHT <= CAPTION_BOX.height) return size;
  }
  return CAPTION_MIN_FONT;
}

function buildStripesHtml(theme) {
  const bar = (cx, cy, length, thickness, color, opacity) =>
    `<div style="position:absolute;left:${cx - length / 2}px;top:${cy - thickness / 2}px;width:${length}px;height:${thickness}px;background:${color};opacity:${opacity};transform:rotate(-45deg);"></div>`;

  // إزاحة القطعة المرافقة بشكل عمودي على اتجاه القطعة الأساسية
  const d = Math.round(54 / Math.SQRT2);

  return STRIPES.map(
    ({ x, y, length, thickness }) =>
      bar(x, y, length, thickness, theme.accentColor, 1) +
      bar(x + d, y + d, length, 20, theme.stripeColor, 0.9)
  ).join("");
}

/**
 * @param {Object} data
 * @param {string} data.studentName
 * @param {string} data.caption - النص الكامل اللي بيظهر في منتصف الشهادة
 *   (أكتر من سطر + **bold** مدعومين).
 * @param {string} data.signatureName
 * @param {string} data.date
 * @param {string} data.backgroundStyle
 * @param {Object} [data.assets] - { badge, logo, stem, iAIDL, finland, kidsafe }
 * @param {boolean} [data.interactive] - معاينة الأدمن فقط
 * @returns {Promise<string>} full HTML document ready for page.setContent()
 */
export async function buildCertificateHtml({
  studentName = "Youssef Mourad",
  caption = "",
  signatureName = "Aya Elnagar",
  date = "15/12/2025",
  backgroundStyle = "navy-orange",
  assets = {},
  interactive = false,
} = {}) {
  const theme = BACKGROUND_THEMES[backgroundStyle] || BACKGROUND_THEMES["navy-orange"];
  const accent = theme.accentColor;
  const ink = "#0d2b3e";

  const [badgeSrc, logoSrc, stemSrc, iaidlSrc, finlandSrc, kidsafeSrc] = await Promise.all([
    resolveAsset(assets.badge, "badge.png"),
    resolveAsset(assets.logo, "code-logo.png"),
    resolveAsset(assets.stem, "stem.png"),
    resolveAsset(assets.iAIDL, "iAIDL.png"),
    resolveAsset(assets.finland, "finland.png"),
    resolveAsset(assets.kidsafe, "kidsafe.png"),
  ]);

  // ✅ بيلف أي صورة قابلة للتخصيص بـ overlay — بس لو interactive=true.
  // لو false بيرجع الـ <img> زي ما هو (التوليد الحقيقي مالوش علاقة بالوضع ده).
  const editable = (key, label, imgHtml) => {
    if (!interactive) return imgHtml;
    return `<div class="cert-editable" data-asset-key="${key}">
      ${imgHtml}
      <div class="cert-editable-overlay"><span>✎ ${escapeHtml(label)}</span></div>
    </div>`;
  };

  const interactiveStyle = interactive
    ? `
    .cert-editable { position: relative; display: inline-block; cursor: pointer; line-height: 0; }
    .cert-editable img { display: block; border-radius: 8px; transition: filter 150ms ease, outline 150ms ease; }
    .cert-editable:hover img { filter: brightness(0.5); outline: 3px dashed #ff6a00; outline-offset: 4px; }
    .cert-editable-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 150ms ease; pointer-events: none;
      font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,0.7); text-align: center; padding: 6px;
    }
    .cert-editable:hover .cert-editable-overlay { opacity: 1; }
  `
    : "";

  const interactiveScript = interactive
    ? `
  <script>
    document.querySelectorAll('.cert-editable').forEach(function (el) {
      el.addEventListener('click', function () {
        window.parent.postMessage(
          { type: 'cert-asset-click', key: el.getAttribute('data-asset-key') },
          '*'
        );
      });
    });
  </script>`
    : "";

  const corner = (pos) => `<span class="corner" style="${pos}"></span>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @font-face {
      font-family: 'Alex Brush';
      font-style: normal;
      font-weight: 400;
      src: url(${fontToDataUri("alex-brush.woff2")}) format('woff2');
    }
    @font-face {
      font-family: 'Playfair Display';
      font-style: normal;
      font-weight: 400;
      src: url(${fontToDataUri("playfair-display.woff2")}) format('woff2');
    }
    @font-face {
      font-family: 'Cormorant Garamond';
      font-style: normal;
      font-weight: 400;
      src: url(${fontToDataUri("cormorant-garamond.woff2")}) format('woff2');
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    p, h1, h2, h3 { margin: 0; font-weight: normal; }

    .canvas {
      position: relative;
      width: ${CANVAS_WIDTH}px;
      height: ${CANVAS_HEIGHT}px;
      margin: 0 auto;
      overflow: hidden;
      background-color: ${theme.outerBg};
      background-image: linear-gradient(150deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.18) 100%);
      font-family: 'Cormorant Garamond', 'Georgia', serif;
      /* ✅ أرقام Lining (1 مش ı) */
      font-variant-numeric: lining-nums;
      font-feature-settings: "lnum" 1, "kern" 1, "liga" 1;
      color: ${ink};
    }

    .panel {
      position: absolute;
      top: ${PANEL_MARGIN_TOP}px; right: ${PANEL_MARGIN_X}px; bottom: ${PANEL_MARGIN_BOTTOM}px; left: ${PANEL_MARGIN_X}px;
      background: #fefefd;
      box-shadow: 0 14px 50px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: ${PANEL_PADDING_TOP}px ${PANEL_PADDING_X}px ${PANEL_PADDING_BOTTOM}px;
    }
    .panel > * { flex-shrink: 0; }

    .frame-outer { position: absolute; inset: 34px; border: 2px solid ${accent}; pointer-events: none; }
    .frame-inner { position: absolute; inset: 46px; border: 1px solid ${accent}; pointer-events: none; }
    .corner { position: absolute; width: 12px; height: 12px; background: #fff; border: 2px solid ${accent}; pointer-events: none; }

    .badge { position: absolute; z-index: 20; top: ${BADGE_BOX.top}px; left: ${BADGE_BOX.left}px; }
    .badge img { width: ${BADGE_BOX.width}px; height: auto; display: block; }

    .logo { height: ${LOGO_HEIGHT}px; display: flex; justify-content: center; }
    .logo img { height: ${LOGO_HEIGHT}px; width: auto; display: block; }

    .lead { margin-top: 43px; font-size: 29px; line-height: 1.28; letter-spacing: 0.5px; -webkit-text-stroke: 0.25px ${ink}; }
    .title {
      margin-top: -10px;
      font-size: 176px; line-height: 1.02; letter-spacing: 3px;
      font-variant: small-caps; white-space: nowrap;
      -webkit-text-stroke: 1px ${ink};
    }
    .sub { margin-top: 15px; font-size: 32px; line-height: 1.15; -webkit-text-stroke: 0.25px ${ink}; }

    .name {
      display: block; width: 100%; margin-top: 40px;
      font-family: 'Playfair Display', serif;
      font-size: ${NAME_MAX_FONT}px; line-height: 1.2;
      color: ${accent}; text-align: center; white-space: nowrap;
      -webkit-text-stroke: 0.5px ${accent};
    }

    /* ✅ الكابشن لازق تحت الاسم وفوق "We wish you..." بمسافات ثابتة.
       المساحة الفاضية (لو الكابشن قصير) بتتوزع على الـ spacers (.sp) في أماكن
       تانية (تحت اللوجو، وقبل الشعارات، وقبل الفوتر) بدل ما تعمل فجوة حوالين الكابشن. */
    .caption-zone { width: 100%; margin: 22px 0 32px; }
    .sp { flex: 1 1 0; min-height: 0; }
    .caption {
      width: 100%;
      text-align: center;
      line-height: ${CAPTION_LINE_HEIGHT};
      overflow-wrap: anywhere;
      -webkit-text-stroke: 0.3px ${ink};
    }
    .caption strong { font-weight: bold; }

    .wish { font-size: 44px; line-height: 1.15; font-weight: bold; }

    .partners { margin-top: 36px; display: flex; justify-content: center; align-items: center; gap: 42px; height: ${PARTNER_HEIGHT}px; }
    .partners img { height: ${PARTNER_HEIGHT}px; width: auto; max-width: ${PARTNER_MAX_WIDTH}px; object-fit: contain; display: block; }

    .footer { margin-top: 32px; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; }
    .date-block { text-align: left; padding-left: 127px; }
    .date-block .label { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    .date-block .value { font-size: 24px; }
    .sign-block { text-align: center; padding-right: 67px; }
    .sign-block .script { font-family: 'Alex Brush', 'Dancing Script', 'Great Vibes', cursive; font-size: 58px; line-height: 1.1; margin-bottom: 4px; }
    .sign-block .printed { font-size: 24px; font-weight: bold; }
    .sign-block .role { font-size: 19px; margin-top: 2px; }

    ${interactiveStyle}
  </style>
</head>
<body>
  <div class="canvas">
    ${buildStripesHtml(theme)}

    <div class="panel">
      <div class="frame-outer"></div>
      <div class="frame-inner"></div>
      ${corner("top:28px;left:28px;")}
      ${corner("top:28px;right:28px;")}
      ${corner("bottom:28px;left:28px;")}
      ${corner("bottom:28px;right:28px;")}

      <div class="logo">
        ${editable("logo", "تغيير اللوجو", `<img data-trim="white" src="${logoSrc}" alt="Code School" />`)}
      </div>

      <div class="sp"></div>
      <p class="lead">Proudly present this official</p>
      <h1 class="title">Certificate</h1>
      <p class="sub">To our beloved, young &amp; dedicated member:</p>

      <h2 class="name" id="cert-name">${escapeHtml(studentName)}</h2>

      <div class="caption-zone" id="cert-caption-zone">
        <div class="caption" id="cert-caption" style="font-size:${estimateCaptionFontSize(caption)}px;">${captionToHtml(caption)}</div>
      </div>

      <h3 class="wish">We wish you all the best!</h3>

      <div class="sp"></div>

      <div class="partners">
        ${editable("stem", "تغيير الشعار", `<img data-trim="white" src="${stemSrc}" alt="STEM" />`)}
        ${editable("iAIDL", "تغيير الشعار", `<img data-trim="white" src="${iaidlSrc}" alt="iAIDL" />`)}
        ${editable("finland", "تغيير الشعار", `<img data-trim="white" src="${finlandSrc}" alt="Finland" />`)}
        ${editable("kidsafe", "تغيير الشعار", `<img data-trim="white" src="${kidsafeSrc}" alt="KidSAFE" />`)}
      </div>

      <div class="sp"></div>

      <div class="footer">
        <div class="date-block">
          <p class="label">Date</p>
          <p class="value">${escapeHtml(date)}</p>
        </div>
        <div class="sign-block">
          <p class="script">${escapeHtml(signatureName)}</p>
          <p class="printed">${escapeHtml(signatureName)}</p>
          <p class="role">Head Of Education</p>
        </div>
      </div>
    </div>

    <div class="badge">
      ${editable("badge", "تغيير الشارة", `<img data-trim="alpha" src="${badgeSrc}" alt="Badge" />`)}
    </div>
  </div>

  <script>
    (function () {
      var sps = Array.prototype.slice.call(document.querySelectorAll('.sp'));
      var box = document.getElementById('cert-caption');
      var name = document.getElementById('cert-name');

      // ✅ Auto-trim: بيقص الهوامش الفاضية (شفافة، أو بيضا للّوجوهات) من حوالين الصورة
      // عشان تظهر بالحجم الحقيقي بدل ما تتصغّر جوّه مساحة فاضية.
      function trimImg(img) {
        var whiteIsEmpty = img.getAttribute('data-trim') === 'white';
        return new Promise(function (resolve) {
          function run() {
            try {
              var w = img.naturalWidth, h = img.naturalHeight;
              if (!w || !h) return resolve();
              var c = document.createElement('canvas');
              c.width = w; c.height = h;
              var ctx = c.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(img, 0, 0);
              var d = ctx.getImageData(0, 0, w, h).data;
              var minX = w, minY = h, maxX = -1, maxY = -1;
              for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                  var i = (y * w + x) * 4;
                  var empty = d[i + 3] < 48 ||
                    (whiteIsEmpty && d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240);
                  if (!empty) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                  }
                }
              }
              if (maxX < 0) return resolve();
              var tw = maxX - minX + 1, th = maxY - minY + 1;
              if (tw > w * 0.97 && th > h * 0.97) return resolve(); // مفيش هوامش تتقص
              var t = document.createElement('canvas');
              t.width = tw; t.height = th;
              t.getContext('2d').drawImage(c, minX, minY, tw, th, 0, 0, tw, th);
              img.onload = function () { resolve(); };
              img.onerror = function () { resolve(); };
              img.src = t.toDataURL('image/png');
            } catch (e) { resolve(); }
          }
          if (img.complete && img.naturalWidth) run();
          else {
            img.onload = run;
            img.onerror = function () { resolve(); };
          }
        });
      }

      function fitName() {
        var size = ${NAME_MAX_FONT};
        name.style.fontSize = size + 'px';
        while (name.scrollWidth > name.clientWidth && size > ${NAME_MIN_FONT}) {
          size -= 1;
          name.style.fontSize = size + 'px';
        }
      }

      // أقل مساحة فاضية بين الـ spacers — لو أقل من 12px يبقى الكابشن كبير على اللوح
      function minSpace() {
        var m = 100000;
        sps.forEach(function (s) { m = Math.min(m, s.offsetHeight); });
        return m;
      }

      function fitCaption() {
        var size = ${CAPTION_MAX_FONT};
        box.style.fontSize = size + 'px';
        while (minSpace() < 12 && size > ${CAPTION_MIN_FONT}) {
          size -= 1;
          box.style.fontSize = size + 'px';
        }
      }

      function fit() { fitName(); fitCaption(); }

      fit();

      var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      var trims = Promise.all(
        Array.prototype.slice.call(document.querySelectorAll('img[data-trim]')).map(trimImg)
      ).catch(function () {});

      // الكرون بيستنى الـ promise ده قبل اللقطة
      window.__certReady = Promise.all([fontsReady, trims]).then(fit);
    })();
  </script>
  ${interactiveScript}
</body>
</html>
`;
}

export default buildCertificateHtml;