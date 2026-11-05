// src/app/api/groups/[id]/send-message/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/authMiddleware";
import {
  GroupMessageError,
  getGroupRecipients,
  sendGroupMessage,
} from "../../../../services/group-message-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // الإرسال متسلسل (~0.8s لكل رسالة) — زوّدها لو الجروبات كبيرة

function errorResponse(error) {
  if (error instanceof GroupMessageError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error("❌ group send-message error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

// GET → قائمة المستلمين المحتملين (للمعاينة والاختيار اليدوي)
export async function GET(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    return NextResponse.json({ success: true, data: await getGroupRecipients(id) });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST → إرسال الرسالة
// overrides (اختياري): نص مخصص لكل فئة { student|guardian|instructor: { ar, en } }
export async function POST(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json();

    const data = await sendGroupMessage({
      groupId: id,
      audience: body.audience,
      selectedKeys: Array.isArray(body.selectedKeys) ? body.selectedKeys : [],
      contentAr: String(body.contentAr ?? ""),
      contentEn: String(body.contentEn ?? ""),
      overrides: body.overrides && typeof body.overrides === "object" ? body.overrides : {},
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}