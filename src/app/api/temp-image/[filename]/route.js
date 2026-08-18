// /src/app/api/temp-image/[filename]/route.js
//
// ✅ ليه الملف ده موجود؟
// Next.js بيسيرف مجلد public/ كـ "لقطة" (snapshot) وقت next build فقط —
// أي ملف يتضاف جوه public/ بعد كده وقت الـ runtime (زي صور الشهادات اللي
// Puppeteer بيولدها) مش هيتعرض أبدًا ("Files added at runtime won't be
// available" - توثيق Next.js الرسمي). عشان كده صور preview/الشهادات
// بتترجع 404 حتى لو موجودة فعليًا على الديسك.
//
// الحل: بنحفظ الصور المولّدة في مجلد بره public/ تمامًا (GENERATED_DIR)،
// وبنسيبه الـ route ده يقرأها من الديسك ويرجعها كـ HTTP response مباشرة.
// كده الملف بيتعرض فورًا لحظة ما يتولد، من غير أي اعتماد على build.

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// ✅ لازم يبقى نفس المسار المستخدم في preview/route.js و cron/route.js
export const GENERATED_DIR = "/home/codeschool/generated/temp";

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(request, { params }) {
  const { filename } = await params;

  // ✅ حماية من path traversal (مثلاً ../../etc/passwd)
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) {
    return NextResponse.json({ success: false, error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(GENERATED_DIR, safeName);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
  }
}