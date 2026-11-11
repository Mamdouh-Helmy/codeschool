// src/app/api/groups/[id]/member-messages/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/authMiddleware";
import {
  GroupMessageError,
  getMemberMessages,
  sendDirectMessage,
} from "../../../../services/group-message-service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function errorResponse(error) {
  if (error instanceof GroupMessageError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error("❌ member-messages error:", error);
  return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
}

// GET ?kind=student|instructor&id=<memberId>&scope=group|all
// → سجل الرسائل + المستلمين (الطالب وولي أمره، أو المدرس) + معلومات الجروب
export async function GET(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { id: groupId } = await params;
    const sp = new URL(req.url).searchParams;
    const data = await getMemberMessages(groupId, {
      kind: sp.get("kind"),
      id: sp.get("id"),
      scope: sp.get("scope") || "group",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST { recipientKey, content, language: "auto"|"ar"|"en", raw: boolean }
export async function POST(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { id: groupId } = await params;
    const body = await req.json();

    const data = await sendDirectMessage({
      groupId,
      recipientKey: String(body.recipientKey || ""),
      content: String(body.content ?? ""),
      language: body.language || "auto",
      raw: body.raw === true,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}