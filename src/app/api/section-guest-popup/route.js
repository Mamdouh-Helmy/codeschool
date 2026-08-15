import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SectionGuestPopup from "../../models/SectionGuestPopup";

export const revalidate = 0;

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const filter = {};
    if (activeOnly) filter.isActive = true;

    // سجل واحد فقط — لو مش موجود يترجع فاضي والفرونت يستخدم الديفولت
    const record = await SectionGuestPopup.findOne(filter).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: record,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "فشل في جلب البيانات", error: error.message },
      { status: 500 }
    );
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    // سجل واحد بس مسموح — لو موجود ابعت PUT بدل POST
    const existing = await SectionGuestPopup.findOne();
    if (existing) {
      return NextResponse.json(
        { success: false, message: "يوجد بالفعل سجل واحد. عدّله بدلاً من إنشاء جديد." },
        { status: 409 }
      );
    }

    const record = await SectionGuestPopup.create(body);

    return NextResponse.json({
      success: true,
      data: record,
      message: "تم الإنشاء بنجاح",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = {};
      for (const f in error.errors) errors[f] = error.errors[f].message;
      return NextResponse.json({ success: false, message: "بيانات غير صالحة", errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: "فشل في الإنشاء", error: error.message },
      { status: 500 }
    );
  }
}