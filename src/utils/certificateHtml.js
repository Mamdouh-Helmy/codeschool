// /src/app/utils/certificateHtml.js
//
// ✅ شهادة بتصميم مطابق للـ reference بتاع العميل (بورتريه 3:4):
//    خلفية داكنة بقطع قُطرية برتقالي، لوح أبيض بإطار مزدوج، شارة فوق الركن
//    الشمال، لوجو، عنوان CERTIFICATE، اسم الطالب، كابشن، شعارات، تاريخ وتوقيع.
//
// ✅ المقاس ثابت 1200×1600. الكابشن (certificateCaption من الموديول) بقى هو
//    النص الوحيد في المنتصف: مفيش "You have successfully completed" ولا
//    إنجازات ثابتة — اللي الأدمن يكتبه هو اللي يظهر.
//    - بيدعم أكتر من سطر.
//    - بيدعم **bold** لأي جزء من السطر.
//    - لو الكابشن طويل، الخط بيصغر أوتوماتيك (Auto-fit) لحد ما يتسع في
//      المساحة المخصصة له، فمفيش حاجة بتخرج برا اللوح أبدًا.
//
// ✅ الـ Auto-fit بيتم بسكريبت صغير جوه الـ HTML نفسه، فبيشتغل بنفس الشكل في
//    معاينة الأدمن (iframe) وفي Puppeteer. الكرون بيستنى window.__certReady
//    قبل أخذ اللقطة (شوف cron/certificates/route.js).
//
// ✅ باقي الميزات زي ما هي: الصور من الفايل سيستم أو من إعدادات الأدمن
//    (Cloudinary) مع fallback للصورة المحلية، ووضع interactive للمعاينة.
//
// لو غيّرت التصميم هنا، لا تنسى CERT_DESIGN_FALLBACK_HEIGHT في
// CertificatesAdmin.tsx (لازم يفضل = CANVAS_HEIGHT).

import fs from "fs";
import path from "path";

// ─── Layout constants (عدّل من هنا لو عايز تظبط حاجة) ─────────────────────────
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1600;
const PANEL_MARGIN = 56; // المسافة بين اللوح الأبيض وحافة الصورة
const PANEL_PADDING_X = 100;

// مكان وحجم الشارة (بالنسبة لحافة الصورة كلها مش اللوح)
const BADGE_BOX = { top: 22, left: 122, width: 280 };

// المساحة المخصصة للكابشن + حدود حجم الخط
const CAPTION_BOX = {
  width: CANVAS_WIDTH - PANEL_MARGIN * 2 - PANEL_PADDING_X * 2, // 888
  height: 400,
};
const CAPTION_MAX_FONT = 32;
const CAPTION_MIN_FONT = 12;
const CAPTION_LINE_HEIGHT = 1.5;

// اسم الطالب: بيصغر لو طويل عشان يفضل سطر واحد
const NAME_MAX_FONT = 58;
const NAME_MIN_FONT = 30;

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
  const AVG_CHAR_EM = 0.46; // تقدير متحفظ لـ Cormorant Garamond

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
 *   (أكتر من سطر + **bold** مدعومين). لازم يحتوي الجملة كاملة بما فيها
 *   "You have successfully completed" لو العميل عايزها.
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
      color: ${ink};
    }

    .panel {
      position: absolute;
      top: ${PANEL_MARGIN}px; right: ${PANEL_MARGIN}px; bottom: ${PANEL_MARGIN}px; left: ${PANEL_MARGIN}px;
      background: #fefefd;
      box-shadow: 0 14px 50px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 190px ${PANEL_PADDING_X}px 74px;
    }
    .panel > * { flex-shrink: 0; }

    .frame-outer { position: absolute; inset: 34px; border: 2px solid ${accent}; pointer-events: none; }
    .frame-inner { position: absolute; inset: 46px; border: 1px solid ${accent}; pointer-events: none; }
    .corner { position: absolute; width: 12px; height: 12px; background: #fff; border: 2px solid ${accent}; pointer-events: none; }

    .badge { position: absolute; z-index: 20; top: ${BADGE_BOX.top}px; left: ${BADGE_BOX.left}px; }
    .logo { height: 128px; display: flex; justify-content: center; }
    .logo img { height: 128px; width: auto; display: block; }

    .lead { margin-top: 26px; font-size: 31px; line-height: 1.2; letter-spacing: 1px; }
    .title {
      margin-top: 4px;
      font-size: 144px; line-height: 1.02; letter-spacing: 3px;
      font-variant: small-caps; white-space: nowrap;
      -webkit-text-stroke: 1.4px ${ink};
    }
    .sub { margin-top: 6px; font-size: 30px; line-height: 1.2; }

    .name {
      display: block; width: 100%; margin-top: 26px;
      font-family: 'Playfair Display', serif;
      font-size: ${NAME_MAX_FONT}px; line-height: 1.2;
      color: ${accent}; text-align: center; white-space: nowrap;
      -webkit-text-stroke: 0.6px ${accent};
    }

    /* منطقة الكابشن: بتاخد كل المساحة الفاضية بين الاسم و"We wish you..." */
    .caption-zone {
      flex: 1 1 0; min-height: 0; width: 100%;
      margin: 10px 0;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .caption {
      width: 100%;
      text-align: center;
      line-height: ${CAPTION_LINE_HEIGHT};
      overflow-wrap: anywhere;
    }

    .wish { font-size: 42px; line-height: 1.15; font-weight: bold; }

    .partners { margin-top: 26px; display: flex; justify-content: center; align-items: center; gap: 26px; height: 84px; }
    .partners img { height: 84px; width: auto; max-width: 190px; object-fit: contain; display: block; }

    .footer { margin-top: 30px; width: 84%; display: flex; justify-content: space-between; align-items: flex-end; }
    .date-block { text-align: left; padding-left: 10px; }
    .date-block .label { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    .date-block .value { font-size: 24px; }
    .sign-block { text-align: center; padding-right: 10px; }
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
        ${editable("logo", "تغيير اللوجو", `<img src="${logoSrc}" alt="Code School" />`)}
      </div>

      <p class="lead">Proudly present this official</p>
      <h1 class="title">Certificate</h1>
      <p class="sub">To our beloved, young &amp; dedicated member:</p>

      <h2 class="name" id="cert-name">${escapeHtml(studentName)}</h2>

      <div class="caption-zone" id="cert-caption-zone">
        <div class="caption" id="cert-caption" style="font-size:${estimateCaptionFontSize(caption)}px;">${captionToHtml(caption)}</div>
      </div>

      <h3 class="wish">We wish you all the best!</h3>

      <div class="partners">
        ${editable("stem", "تغيير الشعار", `<img src="${stemSrc}" alt="STEM" />`)}
        ${editable("iAIDL", "تغيير الشعار", `<img src="${iaidlSrc}" alt="iAIDL" />`)}
        ${editable("finland", "تغيير الشعار", `<img src="${finlandSrc}" alt="Finland" />`)}
        ${editable("kidsafe", "تغيير الشعار", `<img src="${kidsafeSrc}" alt="KidSAFE" />`)}
      </div>

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
      ${editable("badge", "تغيير الشارة", `<img src="${badgeSrc}" alt="Badge" style="width:${BADGE_BOX.width}px;display:block;" />`)}
    </div>
  </div>

  <script>
    // ✅ Auto-fit: الاسم يفضل سطر واحد، والكابشن يتسع جوه مساحته مهما كان طويل.
    (function () {
      var zone = document.getElementById('cert-caption-zone');
      var box = document.getElementById('cert-caption');
      var name = document.getElementById('cert-name');

      function fitName() {
        var size = ${NAME_MAX_FONT};
        name.style.fontSize = size + 'px';
        while (name.scrollWidth > name.clientWidth && size > ${NAME_MIN_FONT}) {
          size -= 1;
          name.style.fontSize = size + 'px';
        }
      }

      function fitCaption() {
        var size = ${CAPTION_MAX_FONT};
        box.style.fontSize = size + 'px';
        while (box.offsetHeight > zone.clientHeight && size > ${CAPTION_MIN_FONT}) {
          size -= 1;
          box.style.fontSize = size + 'px';
        }
      }

      function fit() { fitName(); fitCaption(); }

      fit();
      var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      // الكرون بيستنى الـ promise ده قبل اللقطة
      window.__certReady = fontsReady.then(fit);
    })();
  </script>
  ${interactiveScript}
</body>
</html>
`;
}

export default buildCertificateHtml;