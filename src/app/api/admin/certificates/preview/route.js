import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";
import { buildCertificateHtml } from "../../../../utils/certificateHtml";

// ============================================================
// POST /api/admin/certificates/preview
//
// بتولد صورة شهادة تجريبية (test) بنفس تصميم CertificateTemplate — لكن من
// غير React/ReactDOMServer (مينفعش تتستخدم جوه Route Handler، راجع
// utils/certificateHtml.js للتفاصيل). من غير ما تحفظ أي حاجة على أي طالب،
// وبترجع رابط الصورة عشان تتعرض في صفحة الأدمن للمعاينة.
// ============================================================
export async function POST(request) {
  let browser = null;

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const fullHtml = buildCertificateHtml({
      studentName,
      moduleTitle,
      signatureName,
      date: date || new Date().toLocaleDateString("en-GB"),
      achievements,
      backgroundStyle: background,
      baseUrl,
    });

    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });

    const fileName = `preview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
    const filePath = path.join(process.cwd(), "public", "temp", fileName);
    await fs.ensureDir(path.dirname(filePath));
    await page.screenshot({ path: filePath, fullPage: true });
    await page.close();

    return NextResponse.json({ success: true, imageUrl: `/temp/${fileName}` });
  } catch (error) {
    console.error("❌ Error generating certificate preview:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}