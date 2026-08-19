//api/admin/certificates/preview/route.js
import { NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";
import { buildCertificateHtml } from "../../../../../utils/certificateHtml";
import { getBrowser } from "../../../../../utils/browserPool";
import { GENERATED_DIR } from "../../../../../utils/generatedFilesPaths";
import { uploadToCloudinary } from "@/lib/cloudinary";

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
// ✅ تحديث جديد: رفع الصورة على Cloudinary وعرضها بدلاً من الرابط المحلي
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
      uploadToCloudinary: shouldUploadToCloudinary = true, // ✅ خيار رفع على Cloudinary
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

    let imageUrl = `/api/temp-image/${fileName}`;
    let cloudinaryUrl = null;

    // ✅ رفع الصورة على Cloudinary (اختياري)
    if (shouldUploadToCloudinary) {
      try {
        console.log("📤 Uploading preview to Cloudinary...");
        const fileBuffer = await fs.readFile(filePath);
        const base64 = `data:image/png;base64,${fileBuffer.toString("base64")}`;
        cloudinaryUrl = await uploadToCloudinary(base64, "certificates/previews");
        console.log(`✅ Uploaded to Cloudinary: ${cloudinaryUrl}`);
        
        // ✅ نستخدم رابط Cloudinary بدلاً من الرابط المحلي
        imageUrl = cloudinaryUrl;
        
        // ✅ تنظيف: حذف الملف المحلي بعد الرفع
        try {
          await fs.remove(filePath);
          console.log(`🗑️ Deleted local preview file: ${fileName}`);
        } catch (cleanupError) {
          // مش مشكلة لو متحذفش
        }
      } catch (cloudinaryError) {
        console.error("❌ Cloudinary upload failed for preview:", cloudinaryError.message);
        // نحتفظ بالرابط المحلي كـ fallback
        imageUrl = `/api/temp-image/${fileName}`;
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      cloudinaryUrl: cloudinaryUrl || null,
      isCloudinary: !!cloudinaryUrl,
      fileName: fileName,
    });
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