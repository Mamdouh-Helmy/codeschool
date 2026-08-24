//api/admin/certificates/preview-html/route.js
//
// POST /api/admin/certificates/preview-html
//
// ✅ ده مبيستخدمش Puppeteer ولا Cloudinary خالص — بيرجع الـ HTML string
// الخام بس (نفس نص buildCertificateHtml بالظبط)، عشان الفرونت يعرضه فورًا
// جوه <iframe> كمعاينة حية (Live) من غير أي انتظار توليد صورة.
//
// ✅ جديد: بيبعت interactive=true افتراضيًا (المعاينة في مودال الأدمن
// دايمًا تفاعلية) عشان تقدر تدوس على أي صورة/شعار في الشهادة نفسها وتغيّرها
// مباشرة من مكانها، بدل ما تدور عليها في فورم منفصل.
//
// ⚠️ مهم: الصور المستخدمة هنا هي نفسها بالظبط اللي متخزنة في
// CertificateSettings (نفس الـ singleton اللي بيستخدمه الكرون الفعلي وقت
// إرسال الشهادات للطلبة) — يعني اللي شايفه هنا هو اللي فعلاً هيتبعت،
// مفيش نسخة "تجريبية" منفصلة عن الحقيقية.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { buildCertificateHtml } from "../../../../../utils/certificateHtml";
import CertificateSettings from "../../../../models/CertificateSettings";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      studentName = "Youssef Mourad",
      moduleTitle = "Grade 5-6 Module 1 Chatbot Dev 1",
      signatureName = "Aya Elnagar",
      background = "navy-orange",
      date,
      interactive = true, // ✅ جديد: المعاينة في المودال دايمًا تفاعلية افتراضيًا
    } = body;

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

    // ✅ نفس الإعدادات الحقيقية المستخدمة فعليًا وقت إرسال الشهادات
    const certSettings = await CertificateSettings.getSingleton();
    const assets = {
      badge: certSettings.badge,
      logo: certSettings.logo,
      stem: certSettings.stem,
      iAIDL: certSettings.iAIDL,
      finland: certSettings.finland,
      kidsafe: certSettings.kidsafe,
    };

    const html = await buildCertificateHtml({
      studentName,
      moduleTitle,
      signatureName,
      date: date || new Date().toLocaleDateString("en-GB"),
      achievements,
      backgroundStyle: background,
      assets,
      interactive,
    });

    return NextResponse.json({ success: true, html });
  } catch (error) {
    console.error("❌ Error building certificate preview HTML:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}