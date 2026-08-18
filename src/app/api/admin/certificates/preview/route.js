import { NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";
import { buildCertificateHtml } from "../../../../../utils/certificateHtml";
import { getBrowser } from "../../../../../utils/browserPool";
import { GENERATED_DIR } from "../../../temp-image/[filename]/route";

// ============================================================
// POST /api/admin/certificates/preview
//
// بتولد صورة شهادة تجريبية (test) بنفس تصميم CertificateTemplate — لكن من
// غير React/ReactDOMServer. من غير ما تحفظ أي حاجة على أي طالب، وبترجع
// رابط الصورة عشان تتعرض في صفحة الأدمن للمعاينة.
//
// ✅ تحديث: بيستخدم browser instance واحد مشترك (browserPool) بدل ما يفتح
// ويقفل Chrome في كل request — أسرع بكتير وأقل استهلاك للموارد.
// ✅ تحديث: الصور بقت base64 جوه الـ HTML نفسه (راجع certificateHtml.js)
// فمفيش استنى لطلبات شبكة، فاستخدمنا "load" بدل "networkidle0".
// ============================================================
export async function POST(request) {
  let page = null;

  try {
    const body = await request.json();

    const {
      studentName = "Youssef Mourad",
      moduleTitle = "Grade 5-6 Module 1 Chatbot Dev 1",
      signatureName = "Aya Elnagar",
      background = "navy-orange",
      date,
    } = body;

    // achievements ممكن تيجي كـ array أو كنص متعدد الأسطر
    let achievements = body.achievements;
    if (typeof achievements === "string") {
      achievements = achievements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (!Array.isArray(achievements) || achievements.length === 0) {
      achievements = ["Successfully completed all module requirements."];
    }

    const fullHtml = buildCertificateHtml({
      studentName,
      moduleTitle,
      signatureName,
      date: date || new Date().toLocaleDateString("en-GB"),
      achievements,
      backgroundStyle: background,
    });

    const browser = await getBrowser();
    page = await browser.newPage();

    // ✅ Logging مفيد لو أي مشكلة رجعت تاني — بيتشال بسهولة لو مش محتاجه
    page.on("requestfailed", (req) => {
      console.log("❌ [certificate] REQUEST FAILED:", req.url(), "-", req.failure()?.errorText);
    });
    page.on("pageerror", (err) => {
      console.log("💥 [certificate] PAGE ERROR:", err.message);
    });

    await page.setViewport({ width: 1200, height: 900 });

    // ✅ "load" كفاية دلوقتي لأن مفيش صور/خطوط خارجية بتتحمل بالشبكة —
    // كل حاجة base64 جوه الـ HTML نفسه أو خطوط النظام.
    await page.setContent(fullHtml, { waitUntil: "load", timeout: 30000 });

    const fileName = `preview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
    const filePath = path.join(GENERATED_DIR, fileName);
    await fs.ensureDir(GENERATED_DIR);
    await page.screenshot({ path: filePath, fullPage: true });

    return NextResponse.json({ success: true, imageUrl: `/api/temp-image/${fileName}` });
  } catch (error) {
    console.error("❌ Error generating certificate preview:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    if (page) await page.close();
  }
}