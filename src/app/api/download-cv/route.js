// app/api/download-cv/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");
  const rawName = searchParams.get("name") || "CV";

  if (!fileUrl) {
    return NextResponse.json(
      { success: false, message: "Missing file url" },
      { status: 400 }
    );
  }

  try {
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch CV file" },
        { status: 502 }
      );
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const contentType = fileRes.headers.get("content-type") || "application/pdf";

    // تنضيف الاسم من أي حروف ممنوعة في أسماء الملفات
    const cleanName = rawName.replace(/[\\/:*?"<>|]/g, "").trim() || "CV";
    // نسخة ASCII كـ fallback لو الاسم عربي (لبعض المتصفحات القديمة)
    const asciiFallback = cleanName.replace(/[^\x00-\x7F]/g, "").trim() || "CV";

    const disposition = `attachment; filename="${asciiFallback}.pdf"; filename*=UTF-8''${encodeURIComponent(
      cleanName
    )}.pdf`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Download CV error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}