// /src/app/utils/browserPool.js
//
// ✅ Browser instance واحد مشترك لكل توليد شهادات (preview + cron job).
// بدل ما نفتح Chrome process جديدة كاملة في كل request (بطيء جدًا،
// ~1-2 ثانية إضافية، وبيستهلك ميموري أكتر)، بنفتحه مرة واحدة ونعيد
// استخدامه. لو الـ browser اتقفل أو حصله crash، بنعيد فتحه تلقائيًا.
//
// ✅ الفلاجات دي مهمة جدًا على VPS صغيرة:
//   --disable-dev-shm-usage : Chrome بيستخدم /dev/shm للـ shared memory،
//     وده بيكون محدود جدًا (غالبًا 64MB) على أغلب الـ VPS providers.
//     من غيرها، Chrome ممكن يعلّق أو يعمل crash بصمت من غير error واضح.
//   --no-sandbox / --disable-setuid-sandbox : مطلوبة لما تشغّل Chrome
//     كـ root أو جوه بيئة من غير sandbox permissions كاملة.
//   --disable-gpu : مفيش حاجة اسمها GPU على السيرفر أصلاً.

import puppeteer from "puppeteer";

let browserInstance = null;
let launching = null;

const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--disable-extensions",
];

export async function getBrowser() {
  // لو فيه instance شغالة فعليًا، استخدمها
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // لو في عملية launch شغالة بالفعل (طلبين جم في نفس اللحظة)، استنى نفس الـ promise
  if (launching) {
    return launching;
  }

  launching = puppeteer
    .launch({
      headless: true,
      args: LAUNCH_ARGS,
    })
    .then((browser) => {
      browserInstance = browser;
      launching = null;

      // لو Chrome حصله crash أو اتقفل من بره، نظف الـ reference
      // عشان next call يعمل launch جديد بدل ما يفضل يحاول يستخدم واحد ميت
      browser.on("disconnected", () => {
        console.warn("⚠️ Puppeteer browser disconnected, will relaunch on next request.");
        browserInstance = null;
      });

      return browser;
    })
    .catch((err) => {
      launching = null;
      throw err;
    });

  return launching;
}

// اختياري: لو حابب تقفل الـ browser بشكل صريح (مثلاً وقت shutdown)
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}