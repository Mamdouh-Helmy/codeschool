//api/admin/certificate-assets/route.js
//
// GET    -> بيرجع إعدادات الصور الحالية (اللي اتحطت بدل الافتراضي، لو فيه)
// POST   -> بياخد { key, imageUrl } (imageUrl راجع بالفعل من /api/upload-image)
//           ويحفظه كبديل للصورة الافتراضية بتاعة الـ key ده
// DELETE -> ?key=xxx بيرجع الحقل ده للافتراضي (بيمسح القيمة المخصصة)
//
// ⚠️ الرفع نفسه (multipart -> Cloudinary) بيتم بالكامل عبر /api/upload-image
// الموجود بالفعل. الراوت ده مالوش أي علاقة بالرفع، وظيفته الوحيدة إنه
// يربط رابط Cloudinary اللي رجع بالـ key بتاعه جوه CertificateSettings.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import CertificateSettings from "../../../models/CertificateSettings";

const ALLOWED_KEYS = ["badge", "logo", "stem", "iAIDL", "finland", "kidsafe"];

export async function GET() {
  try {
    await connectDB();
    const settings = await CertificateSettings.getSingleton();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("❌ Error fetching certificate assets:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { key, imageUrl } = body;

    if (!key || !ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        { success: false, error: `key غير صالح. لازم يكون واحد من: ${ALLOWED_KEYS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ success: false, error: "imageUrl مطلوب" }, { status: 400 });
    }

    const settings = await CertificateSettings.getSingleton();
    settings[key] = imageUrl;
    await settings.save();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("❌ Error saving certificate asset:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key || !ALLOWED_KEYS.includes(key)) {
      return NextResponse.json(
        { success: false, error: `key غير صالح. لازم يكون واحد من: ${ALLOWED_KEYS.join(", ")}` },
        { status: 400 }
      );
    }

    const settings = await CertificateSettings.getSingleton();
    settings[key] = null;
    await settings.save();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("❌ Error resetting certificate asset:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}