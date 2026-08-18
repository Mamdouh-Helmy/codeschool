// /src/app/utils/certificateHtml.js
//
// ✅ نفس تصميم CertificateTemplate.jsx بالظبط، لكن كـ HTML string عادي من
// غير React/ReactDOMServer. السبب: Route Handlers (app/api/.../route.js)
// شغالة على طبقة "react-server"، ومينفعش تستورد فيها كومبوننت عليه
// "use client" وتستخدم react-dom/server في نفس الوقت — Next.js بيرفض
// الـ build برسالة:
//   "You're importing a component that imports react-dom/server..."
//
// الحل: بما إن الاستخدام هنا هو توليد صورة عن طريق puppeteer فقط (مفيش
// تفاعل ولا React state)، مفيش داعي لـ React أصلاً — بنبني الـ HTML مباشرة.
//
// لو غيّرت تصميم CertificateTemplate.jsx (الكومبوننت اللي بتتعرض في
// المتصفح)، لازم تحدّث الدالة دي هنا كمان عشان يفضلوا متطابقين.

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
 * @param {string} [data.baseUrl] - عشان الصور (badge.png, code-logo.png...) تتحل صح جوه puppeteer
 * @returns {string} full HTML document ready for page.setContent()
 */
export function buildCertificateHtml({
  studentName = "Youssef Mourad",
  moduleTitle = "Grade 5-6 Module 1 Chatbot Dev 1",
  signatureName = "Aya Elnagar",
  date = "15/12/2025",
  achievements = ["Successfully completed all module requirements."],
  backgroundStyle = "navy-orange",
  baseUrl = "",
} = {}) {
  const theme =
    BACKGROUND_THEMES[backgroundStyle] || BACKGROUND_THEMES["navy-orange"];

  const img = (name) => `${baseUrl}/images/${name}`;

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
    @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400&display=swap');
    body { margin: 0; padding: 0; }
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
        <img src="${img("badge.png")}" alt="Badge" style="width:290px;" />
      </div>

      <div style="margin-top:20px;">
        <img src="${img("code-logo.png")}" alt="Code School" style="width:350px;" />
      </div>

      <div style="text-align:center;">
        <p style="font-size:26px;color:#222;margin-bottom:4px;letter-spacing:1px;">
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
            margin-bottom:40px;
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
        <img src="${img("stem.png")}" alt="STEM" style="width:130px;" />
        <img src="${img("iAIDL.png")}" alt="iAIDL" style="width:130px;" />
        <img src="${img("finland.png")}" alt="Finland" style="width:130px;" />
        <img src="${img("kidsafe.png")}" alt="KidSAFE" style="width:130px;" />
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
