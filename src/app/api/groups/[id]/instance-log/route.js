// src/app/api/groups/[id]/instance-log/route.js
import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/authMiddleware";
import {
  GroupMessageError,
  getGroupInstanceLog,
} from "../../../../services/group-message-service";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const instance = ["all", "main", "eval", "unknown"].includes(searchParams.get("instance"))
      ? searchParams.get("instance")
      : "all";
    const limit = searchParams.get("limit") || "300";

    const data = await getGroupInstanceLog(id, { instance, limit });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof GroupMessageError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("❌ instance-log error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}