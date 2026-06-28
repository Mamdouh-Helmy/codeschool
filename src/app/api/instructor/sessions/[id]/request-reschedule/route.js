// app/api/instructor/sessions/[id]/request-reschedule/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Session from "../../../../../models/Session";
import Group from "../../../../../models/Group";

// ─────────────────────────────────────────────────────────────────────────────
// POST: المدرس بيقدم طلب ترحيل (cascade reschedule) ابتداءً من سيشن معينة
//
// Body: { viewMode: "single" | "withNext", shiftDays?: number }
//
// القواعد:
//  - مينفعش يتقدم على سيشن "completed" أو "cancelled"
//  - مينفعش يتقدم لو فيه طلب pending بالفعل على نفس الجروب (مش بس نفس السيشن)
//  - السيشن دي لازم تكون مش "اليوم" أصلاً (لو هي اليوم بالفعل، أصلاً المدرس
//    عنده access مباشر وملوش لازمة يطلب ترحيل)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (user.role !== "instructor" && user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "هذه الصفحة للمدرسين فقط", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "رقم السيشن غير صالح" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { viewMode = "single", shiftDays = 7 } = body;

    if (!["single", "withNext"].includes(viewMode)) {
      return NextResponse.json(
        { success: false, message: "نوع الطلب غير صالح", code: "INVALID_VIEW_MODE" },
        { status: 400 }
      );
    }

    await connectDB();

    // ── 1. تأكيد إن السيشن تابعة لجروب المدرس ده ────────────────────────────
    const session = await Session.findOne({ _id: id, isDeleted: false });
    if (!session) {
      return NextResponse.json(
        { success: false, message: "الجلسة غير موجودة" },
        { status: 404 }
      );
    }

    const group = await Group.findOne({
      _id: session.groupId,
      "instructors.userId": user.id,
      isDeleted: false,
    }).select("_id name code");

    if (!group && user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "غير مصرح لك بإدارة جلسات هذا الجروب", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // ── 2. منع الطلب على سيشن مكتملة أو ملغاة ────────────────────────────────
    if (["completed", "cancelled"].includes(session.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "لا يمكن طلب فتح جلسة مكتملة أو ملغاة",
          code: "INVALID_SESSION_STATUS",
        },
        { status: 400 }
      );
    }

    // ── 2.5. منع الطلب لو الحضور اتسجل عليها بالفعل، حتى لو status لسه
    //         "scheduled" (الـ status بيتحول completed بس بعد خطوة التقييم،
    //         فممكن يكون فيه فترة بينية الحضور فيها مسجل والـ status لسه
    //         scheduled — السيشن هنا منطقيًا خلصت ومينفعش تتطلب تاني)
    if (session.attendanceTaken) {
      return NextResponse.json(
        {
          success: false,
          message: "تم تسجيل الحضور لهذه الجلسة بالفعل، لا يمكن طلب فتحها مرة أخرى",
          code: "ATTENDANCE_ALREADY_TAKEN",
        },
        { status: 400 }
      );
    }

    // ── 3. منطقياً، السيشن دي أصلاً مش لازم تكون "اليوم" — لو هي اليوم
    //      المدرس أصلاً عنده access مباشر بدون أي طلب
    if (session.isEffectivelyToday()) {
      return NextResponse.json(
        {
          success: false,
          message: "هذه الجلسة متاحة لك بالفعل اليوم، لا حاجة لطلب فتح",
          code: "ALREADY_ACCESSIBLE",
        },
        { status: 400 }
      );
    }

    // ── 4. تقديم الطلب (الـ method نفسها بتتحقق من عدم وجود طلب pending) ────
    try {
      const result = await session.submitCascadeRescheduleRequest(
        { viewMode, shiftDays },
        user.id
      );

      return NextResponse.json({
        success: true,
        message: "تم إرسال طلب فتح الجلسة للأدمن للموافقة",
        data: {
          batchId: result.batchId,
          affectedCount: result.affectedCount,
          viewMode,
          shiftDays,
          groupName: group?.name || "",
          groupCode: group?.code || "",
          preview: result.preview.affectedSessions.map((s) => ({
            sessionId: s.sessionId,
            title: s.title,
            moduleIndex: s.moduleIndex,
            sessionNumber: s.sessionNumber,
            status: s.status,
            oldScheduledDate: s.oldScheduledDate,
            newScheduledDate: s.newScheduledDate,
          })),
        },
      });
    } catch (err) {
      if (err.code === "PENDING_REQUEST_EXISTS") {
        return NextResponse.json(
          {
            success: false,
            message: "يوجد طلب فتح جلسة قيد المراجعة لهذا الجروب بالفعل، يرجى الانتظار حتى يرد الأدمن",
            code: "PENDING_REQUEST_EXISTS",
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("❌ [Request Reschedule API] Error:", error);
    return NextResponse.json(
      { success: false, message: "فشل في إرسال طلب فتح الجلسة", error: error.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: المدرس يقدر يتشيك حالة الطلب الخاصة بالسيشن دي:
//  1) هل فيه طلب pending عالقًا على الجروب بتاع السيشن دي؟ (يمنع تقديم طلب جديد)
//  2) لو مفيش pending، هل آخر طلب على *نفس السيشن دي بالتحديد* كان مرفوضًا؟
//     لو كان، نرجّع سبب الرفض (reviewNotes) عشان نعرضه للمدرس بدل ما يفضل
//     مش عارف ليه طلبه اترفض.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول" },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "رقم السيشن غير صالح" },
        { status: 400 }
      );
    }

    await connectDB();

    const session = await Session.findOne({ _id: id, isDeleted: false }).select(
      "groupId pendingReschedule"
    );
    if (!session) {
      return NextResponse.json({ success: false, message: "الجلسة غير موجودة" }, { status: 404 });
    }

    // ── 1) هل فيه طلب pending على الجروب ده (مش بس على السيشن دي)؟ ─────────
    const pending = await Session.findOne({
      groupId: session.groupId,
      isDeleted: false,
      "pendingReschedule.status": "pending",
    }).select("pendingReschedule");

    if (pending) {
      return NextResponse.json({
        success: true,
        data: {
          hasPendingRequest: true,
          status: "pending",
          batchId: pending.pendingReschedule?.batchId || null,
          viewMode: pending.pendingReschedule?.viewMode || null,
          requestedAt: pending.pendingReschedule?.requestedAt || null,
          reviewNotes: null,
          reviewedAt: null,
        },
      });
    }

    // ── 2) مفيش pending — هل آخر طلب على *نفس السيشن دي* كان مرفوضًا؟ ──────
    // (pendingReschedule بيفضل محفوظ على الـ document حتى بعد reject/approve،
    // لحد ما طلب جديد يستبدله)
    const wasRejected = session.pendingReschedule?.status === "rejected";

    return NextResponse.json({
      success: true,
      data: {
        hasPendingRequest: false,
        status: wasRejected ? "rejected" : null,
        batchId: wasRejected ? session.pendingReschedule.batchId : null,
        viewMode: wasRejected ? session.pendingReschedule.viewMode : null,
        requestedAt: wasRejected ? session.pendingReschedule.requestedAt : null,
        reviewNotes: wasRejected ? session.pendingReschedule.reviewNotes || "" : null,
        reviewedAt: wasRejected ? session.pendingReschedule.reviewedAt : null,
      },
    });
  } catch (error) {
    console.error("❌ [Check Pending Reschedule API] Error:", error);
    return NextResponse.json(
      { success: false, message: "فشل في التحقق من حالة الطلب", error: error.message },
      { status: 500 }
    );
  }
}