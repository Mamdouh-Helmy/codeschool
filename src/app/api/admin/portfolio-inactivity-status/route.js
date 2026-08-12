// /src/app/api/admin/portfolio-inactivity-status/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/authMiddleware";

// ============================================================
// ✅ GET — بروكسي محمي بـ requireAdmin بيكلم cron endpoint من السيرفر
// الـ CRON_SECRET بيفضل على السيرفر بس، مش بيوصل للمتصفح خالص
// ============================================================
export async function GET(req) {
  const authCheck = await requireAdmin(req);
  if (!authCheck.authorized) return authCheck.response;

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/cron/portfolio-inactivity?secret=${process.env.CRON_SECRET}`,
      { cache: "no-store" },
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "فشل جلب البيانات من الـ cron endpoint" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error proxying portfolio-inactivity GET:", error);
    return NextResponse.json(
      { success: false, message: "حصل خطأ أثناء جلب البيانات", error: error.message },
      { status: 500 },
    );
  }
}

// ============================================================
// ✅ POST — تنفيذ الإرسال الفعلي، برضه عن طريق بروكسي محمي
// ============================================================
export async function POST(req) {
  const authCheck = await requireAdmin(req);
  if (!authCheck.authorized) return authCheck.response;

  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL}/api/cron/portfolio-inactivity?secret=${process.env.CRON_SECRET}`,
      { method: "POST" },
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "فشل تنفيذ الإرسال" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error proxying portfolio-inactivity POST:", error);
    return NextResponse.json(
      { success: false, message: "حصل خطأ أثناء الإرسال", error: error.message },
      { status: 500 },
    );
  }
}