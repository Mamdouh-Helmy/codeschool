// app/api/sessions/[id]/open/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";

const fail = (error, status) =>
  NextResponse.json({ success: false, error }, { status });

// auth + validation + تحميل السيشن (مشترك بين POST و DELETE)
async function resolveSession(req, params) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return { response: auth.response };

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { response: fail("Invalid session ID format", 400) };
  }

  await connectDB();
  const session = await Session.findOne({ _id: id, isDeleted: false }).select("_id");
  if (!session) return { response: fail("Session not found", 404) };

  return { auth, session };
}

// ─── POST: فتح الحصة فورًا (earlyAccess) ─────────────────────────────────────
// المدرس يقدر يدخل اللينك ويسجل الحضور بغض النظر عن التاريخ/الحالة،
// ومفيش أي حصة تانية بتتحرك. بيتقفل لوحده لما الحضور يتسجل (consumedAt).
export async function POST(req, { params }) {
  try {
    const { auth, session, response } = await resolveSession(req, params);
    if (response) return response;

    const now = new Date();
    await Session.updateOne(
      { _id: session._id },
      {
        $set: {
          "earlyAccess.enabled": true,
          "earlyAccess.grantedAt": now,
          "earlyAccess.grantedBy": auth.user.id,
          "earlyAccess.batchId": null,
          "earlyAccess.consumedAt": null,
          "metadata.lastModifiedBy": auth.user.id,
          "metadata.updatedAt": now,
        },
      },
    );

    return NextResponse.json({ success: true, message: "تم فتح الحصة" });
  } catch (error) {
    console.error("❌ [Open Session] Error:", error);
    return fail(error.message || "فشل فتح الحصة", 500);
  }
}

// ─── DELETE: إغلاق الحصة (سحب الـ earlyAccess) ───────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const { auth, session, response } = await resolveSession(req, params);
    if (response) return response;

    const now = new Date();
    await Session.updateOne(
      { _id: session._id },
      {
        $set: {
          "earlyAccess.enabled": false,
          "metadata.lastModifiedBy": auth.user.id,
          "metadata.updatedAt": now,
        },
      },
    );

    return NextResponse.json({ success: true, message: "تم إغلاق الحصة" });
  } catch (error) {
    console.error("❌ [Close Session] Error:", error);
    return fail(error.message || "فشل إغلاق الحصة", 500);
  }
}