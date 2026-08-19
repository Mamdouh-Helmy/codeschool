// /src/app/utils/certificateHtml.js
//
// ✅ نفس تصميم CertificateTemplate.jsx بالظبط، لكن كـ HTML string عادي من
// غير React/ReactDOMServer. السبب: Route Handlers (app/api/.../route.js)
// شغالة على طبقة "react-server"، ومينفعش تستورد فيها كومبوننت عليه
// "use client" وتستخدم react-dom/server في نفس الوقت.
//
// ✅ تحديث مهم: الصور دلوقتي بتتقرأ مباشرة من الـ filesystem وتتحول
// لـ base64 (data URI) بدل ما تتطلب بـ HTTP request. السبب: على السيرفر،
// Puppeteer كان بيحاول يطلب الصور عن طريق الدومين العام (baseUrl) حتى لو
// كانت الصور على نفس السيرفر، وده كان بيسبب مشاكل توقف/تعليق (hairpin NAT /
// شبكة). بقراءة الصور محليًا، بنضمن إن توليد الشهادة ميعتمدش على الشبكة
// خالص لجزء الصور، وبيبقى أسرع وأكثر استقرارًا.
//
// لو غيّرت تصميم CertificateTemplate.jsx (الكومبوننت اللي بتتعرض في
// المتصفح)، لازم تحدّث الدالة دي هنا كمان عشان يفضلوا متطابقين.

import fs from "fs";
import path from "path";

const BACKGROUND_THEMES = {
  "navy-orange": {
    outerBg: "#0d2b3e",
    accentColor: "#ff6a00",
    stripeColor: "#123a52",
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

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

// ✅ Cache في الميموري عشان منقراش نفس الملف من الديسك في كل طلب —
// الصور دي ثابتة (badge, logo, partners) فمفيش داعي نعيد القراءة كل مرة.
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
    console.error(
      `⚠️ Could not read image for certificate: ${imageName}`,
      err.message,
    );
    // بنرجع string فاضي بدل ما نكسر توليد الشهادة بالكامل بسبب صورة واحدة ناقصة
    return "";
  }
}

// ✅ نفس فكرة imageToDataUri بالظبط، لكن للخطوط. الخطوط دي (Alex Brush,
// Playfair Display, Cormorant Garamond) اتحمّلت مرة واحدة يدويًا من Google
// Fonts وبقت جوه public/fonts/certificate/ — بنقراها من الديسك ونحولها
// base64 عشان نحطها جوه @font-face من غير أي استيراد شبكة وقت التوليد
// (ده كان سبب الـ Navigation Timeout قبل كده).
const fontDataUriCache = {};

function fontToDataUri(fontFileName) {
  if (fontDataUriCache[fontFileName]) return fontDataUriCache[fontFileName];

  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "certificate",
      fontFileName,
    );
    const fileBuffer = fs.readFileSync(filePath);
    const dataUri = `data:font/woff2;base64,${fileBuffer.toString("base64")}`;
    fontDataUriCache[fontFileName] = dataUri;
    return dataUri;
  } catch (err) {
    console.error(
      `⚠️ Could not read font for certificate: ${fontFileName}`,
      err.message,
    );
    return "";
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {Object} data
 * @param {string} data.studentName
 * @param {string} data.moduleTitle
 * @param {string} data.signatureName
 * @param {string} data.date
 * @param {string[]} data.achievements
 * @param {string} data.backgroundStyle
 * @returns {string} full HTML document ready for page.setContent()
 */
export function buildCertificateHtml({
  studentName = "Youssef Mourad",
  moduleTitle = "Grade 5-6 Module 1 Chatbot Dev 1",
  signatureName = "Aya Elnagar",
  date = "15/12/2025",
  achievements = ["Successfully completed all module requirements."],
  backgroundStyle = "navy-orange",
} = {}) {
  const theme =
    BACKGROUND_THEMES[backgroundStyle] || BACKGROUND_THEMES["navy-orange"];

  const achievementsHtml = achievements
    .map(
      (item) =>
        `<p style="font-size:23px;margin:12px 0;"><span style="font-weight:bold;">•</span> ${escapeHtml(
          item,
        )}</p>`,
    )
    .join("");

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
    body { margin: 0; padding: 0; font-family: 'Georgia', 'Playfair Display', serif; }
  </style>
</head>
<body>
  <div style="
      background-color:${theme.outerBg};
      width:1200px;
      padding:45px;
      position:relative;
      box-sizing:border-box;
      font-family:'Georgia','Playfair Display',serif;
      margin:0 auto;
      overflow:hidden;
    ">
    <div style="position:absolute;top:0;left:0;width:260px;height:400px;background:linear-gradient(135deg, transparent 48%, ${theme.accentColor} 48%, ${theme.accentColor} 52%, transparent 52%);opacity:0.5;"></div>
    <div style="position:absolute;top:0;left:40px;width:260px;height:400px;background:linear-gradient(135deg, transparent 48%, ${theme.stripeColor} 48%, ${theme.stripeColor} 52%, transparent 52%);opacity:0.7;"></div>
    <div style="position:absolute;bottom:0;right:0;width:260px;height:400px;background:linear-gradient(135deg, transparent 48%, ${theme.accentColor} 48%, ${theme.accentColor} 52%, transparent 52%);opacity:0.5;"></div>
    <div style="position:absolute;bottom:0;right:40px;width:260px;height:400px;background:linear-gradient(135deg, transparent 48%, ${theme.stripeColor} 48%, ${theme.stripeColor} 52%, transparent 52%);opacity:0.7;"></div>

    <div style="
        background-color:white;
        width:100%;
        height:100%;
        position:relative;
        z-index:2;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:flex-start;
        box-shadow: inset 0 0 0 2px ${theme.accentColor}, 0 0 0 12px white, 0 0 0 14px ${theme.accentColor};
        border-radius:18px;
        padding:50px 70px;
        box-sizing:border-box;
      ">
      <div style="position:absolute;top:-30px;left:10px;z-index:10;">
        <img src="${imageToDataUri("badge.png")}" alt="Badge" style="width:350px;" />
      </div>

      <div style="margin-top:20px;">
        <img src="${imageToDataUri("code-logo.png")}" alt="Code School" style="width:350px;" />
      </div>

      <div style="text-align:center;">
        <p style="font-size:26px;color:#222;letter-spacing:1px;">
          Proudly present this official
        </p>
        <h1 style="
            font-size:150px;
            font-weight:bold;
            color:#0d2b3e;
            margin:0;
            letter-spacing:4px;
            font-family:'Playfair Display',serif;
            font-variant:small-caps;
            margin-bottom:10px;
          ">
          Certificate
        </h1>
        <p style="font-size:24px;color:#0d2b3e;">
          To our beloved, young &amp; dedicated member:
        </p>
      </div>

      <h2 style="
          font-size:54px;
          color:${theme.accentColor};
          font-weight:bold;
          margin:22px 0;
          font-family:'Playfair Display',serif;
        ">
        ${escapeHtml(studentName)}
      </h2>

      <div style="text-align:center;padding:0 30px;width:100%;color:#0d2b3e;">
        <div style="display:inline-block;text-align:center;font-family:'Cormorant Garamond','Playfair Display',serif;">
          <p style="font-size:26px;margin:12px 0;">
            You have successfully completed <strong>${escapeHtml(moduleTitle)}</strong>
          </p>
          <p style="font-size:23px;margin:12px 0;">
            Throughout this module, you have achieved the following outcomes:
          </p>
          ${achievementsHtml}
        </div>
      </div>

      <div style="text-align:center;margin-top:30px;">
        <h3 style="font-size:34px;color:#0d2b3e;margin:0;font-weight:bold;">
          We wish you all the best!
        </h3>
      </div>

      <div style="display:flex;justify-content:center;align-items:center;margin-top:35px;">
        <img src="${imageToDataUri("stem.png")}" alt="STEM" style="width:130px;" />
        <img src="${imageToDataUri("iAIDL.png")}" alt="iAIDL" style="width:130px;" />
        <img src="${imageToDataUri("finland.png")}" alt="Finland" style="width:130px;" />
        <img src="${imageToDataUri("kidsafe.png")}" alt="KidSAFE" style="width:130px;" />
      </div>

      <div style="display:flex;justify-content:space-between;width:82%;margin-top:40px;color:#0d2b3e;">
        <div style="text-align:left;padding-left:20px;">
          <p style="font-size:22px;font-weight:bold;margin-bottom:4px;">Date</p>
          <p style="font-size:22px;margin-top:0;">${escapeHtml(date)}</p>
        </div>
        <div style="text-align:center;padding-right:20px;">
          <p style="
              font-size:56px;
              font-family:'Alex Brush','Dancing Script','Great Vibes',cursive;
              color:#0d2b3e;
              margin:0 0 6px;
              font-weight:normal;
            ">
            ${escapeHtml(signatureName)}
          </p>
          <p style="font-size:22px;font-weight:bold;margin:0;">${escapeHtml(signatureName)}</p>
          <p style="font-size:17px;margin:2px 0 0;">Head Of Education</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

export default buildCertificateHtml;