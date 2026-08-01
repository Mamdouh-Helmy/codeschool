// app/api/instructor/sessions/[id]/request-reschedule/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Session from "../../../../../models/Session";
import Group from "../../../../../models/Group";

// ─────────────────────────────────────────────────────────────────────────────
// POST: المدرس بيقدم طلب فتح/ترحيل ابتداءً من سيشن معينة
//
// Body: { viewMode: "single" | "withNext", shiftDays?: number }
// (viewMode بيتجاهل تلقائيًا لو الحالة استدعت وضع "استبدال" — راجع الخطوة 3.5)
//
// القواعد النهائية:
//  - ✅ مسموح تمامًا تطلب فتح سيشن completed أو cancelled أو postponed —
//    مفيش أي حظر على الـ status أو attendanceTaken هنا. لو الأدمن وافق،
//    السيشن هتتفتح فورًا (earlyAccess) بغض النظر إن الحضور كان اتسجل عليها
//    قبل كده.
//  - مينفعش يتقدم لو فيه طلب pending بالفعل على نفس الجروب (مش بس نفس السيشن)
//  - السيشن دي لازم تكون مش "متاحة فعليًا اليوم" أصلاً (لو هي كده، المدرس
//    عنده access مباشر وملوش لازمة يطلب فتح)
//  - 🆕 لو فيه سيشن تانية شغالة "اليوم فعليًا" في نفس الجروب، الطلب بيتحول
//    تلقائيًا لوضع "استبدال" (swapToday): السيشن المطلوبة بس هي اللي بتتفتح،
//    وسيشن اليوم بترحل أسبوع مكانها — من غير ما نلمس أي سيشن تانية في
//    السلسلة. لو مفيش سيشن اليوم، بيشتغل الكاسكيد الكامل العادي زي ما هو.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (user.role !== "instructor" && user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "هذه الصفحة للمدرسين فقط",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "رقم السيشن غير صالح" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { viewMode = "single", shiftDays = 7 } = body;

    if (!["single", "withNext"].includes(viewMode)) {
      return NextResponse.json(
        {
          success: false,
          message: "نوع الطلب غير صالح",
          code: "INVALID_VIEW_MODE",
        },
        { status: 400 },
      );
    }

    await connectDB();

    // ── 1. تأكيد إن السيشن تابعة لجروب المدرس ده ────────────────────────────
    const session = await Session.findOne({ _id: id, isDeleted: false });
    if (!session) {
      return NextResponse.json(
        { success: false, message: "الجلسة غير موجودة" },
        { status: 404 },
      );
    }

    const group = await Group.findOne({
      _id: session.groupId,
      "instructors.userId": user.id,
      isDeleted: false,
    }).select("_id name code");

    if (!group && user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح لك بإدارة جلسات هذا الجروب",
          code: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    // ── 2. منطقياً، السيشن دي أصلاً مش لازم تكون "متاحة فعليًا اليوم" —
    //      لو هي كده المدرس أصلاً عنده access مباشر بدون أي طلب. ✅ ده الفحص
    //      الوحيد المتبقي هنا — بغض النظر عن status أو attendanceTaken، أي
    //      سيشن (بما فيها completed) يُسمح بتقديم طلب فتح/استبدال عليها.
    if (session.isEffectivelyToday()) {
      return NextResponse.json(
        {
          success: false,
          message: "هذه الجلسة متاحة لك بالفعل اليوم، لا حاجة لطلب فتح",
          code: "ALREADY_ACCESSIBLE",
        },
        { status: 400 },
      );
    }

    // ── 3. 🆕 لو فيه سيشن شغالة النهاردة فعليًا في نفس الجروب، بنستخدم وضع
    //         "الاستبدال": السيشن دي بس هي اللي بتتفتح، وسيشن اليوم بترحل
    //         أسبوع مكانها — من غير ما نلمس أي حاجة تانية في السلسلة. لو
    //         مفيش سيشن اليوم، الوضع الطبيعي (الكاسكيد الكامل) بيشتغل زي ما
    //         هو تمامًا، من غير أي تغيير في السلوك القديم.
    const todaySession = await Session.findEffectiveTodaySessionInGroup(
      session.groupId,
      session._id,
    );

    if (todaySession) {
      try {
        const result = await session.submitSwapWithTodayRequest(
          { todaySession, shiftDays },
          user.id,
        );

        return NextResponse.json({
          success: true,
          message: "تم إرسال طلب استبدال الجلسة للأدمن للموافقة",
          data: {
            mode: "swapToday",
            batchId: result.batchId,
            affectedCount: result.affectedCount,
            groupName: group?.name || "",
            groupCode: group?.code || "",
            targetSession: {
              id: result.targetSessionId,
              title: result.targetTitle,
            },
            todaySession: {
              id: result.todaySessionId,
              title: result.todaySessionTitle,
              oldScheduledDate: result.todayOldDate,
              newScheduledDate: result.todayNewDate,
            },
          },
        });
      } catch (err) {
        if (err.code === "PENDING_REQUEST_EXISTS") {
          return NextResponse.json(
            {
              success: false,
              message:
                "يوجد طلب فتح جلسة قيد المراجعة لهذا الجروب بالفعل، يرجى الانتظار حتى يرد الأدمن",
              code: "PENDING_REQUEST_EXISTS",
            },
            { status: 409 },
          );
        }
        throw err;
      }
    }

    // ── 4. مفيش سيشن اليوم → الوضع الطبيعي: كاسكيد السلسلة كاملة ────────────
    try {
      const result = await session.submitCascadeRescheduleRequest(
        { viewMode, shiftDays },
        user.id,
      );

      return NextResponse.json({
        success: true,
        message: "تم إرسال طلب فتح الجلسة للأدمن للموافقة",
        data: {
          mode: viewMode,
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
            message:
              "يوجد طلب فتح جلسة قيد المراجعة لهذا الجروب بالفعل، يرجى الانتظار حتى يرد الأدمن",
            code: "PENDING_REQUEST_EXISTS",
          },
          { status: 409 },
        );
      }
      throw err;
    }
  } catch (error) {
    console.error("❌ [Request Reschedule API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في إرسال طلب فتح الجلسة",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: المدرس يقدر يتشيك حالة الطلب الخاصة بالسيشن دي:
//  1) هل فيه طلب pending عالقًا على الجروب بتاع السيشن دي؟ (يمنع تقديم طلب جديد)
//  2) لو مفيش pending، هل آخر طلب على *نفس السيشن دي بالتحديد* كان مرفوضًا؟
//     لو كان، نرجّع سبب الرفض (reviewNotes) عشان نعرضه للمدرس.
//  3) 🆕 لو مفيش pending ولا rejected، نتشيك هل فيه سيشن "اليوم فعليًا" في
//     نفس الجروب ممكن نستبدلها بالسيشن دي (swapCandidate) — عشان الفرونت
//     يعرض واجهة "استبدال" بدل الخيارين العاديين. الفحص ده شغال بغض النظر
//     عن status بتاع أي من السيشنين.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول" },
        { status: 401 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "رقم السيشن غير صالح" },
        { status: 400 },
      );
    }

    await connectDB();

    const session = await Session.findOne({ _id: id, isDeleted: false });
    if (!session) {
      return NextResponse.json(
        { success: false, message: "الجلسة غير موجودة" },
        { status: 404 },
      );
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
          swapCandidate: null,
        },
      });
    }

    // ── 2) مفيش pending — هل آخر طلب على *نفس السيشن دي* كان مرفوضًا؟ ──────
    const wasRejected = session.pendingReschedule?.status === "rejected";

    // ── 3) 🆕 مفيش pending — نشوف هل فيه سيشن اليوم فعليًا ممكن نستبدلها
    //         بالسيشن دي. مفيش أي فحص على status هنا — completed مسموحة
    //         تمامًا كطرف في عملية الاستبدال (سواء كسيشن مطلوبة أو كسيشن يوم).
    let swapCandidate = null;
    if (!session.isEffectivelyToday()) {
      const todaySession = await Session.findEffectiveTodaySessionInGroup(
        session.groupId,
        session._id,
      );
      if (todaySession) {
        swapCandidate = {
          sessionId: todaySession._id,
          title: todaySession.title,
          sessionNumber: todaySession.sessionNumber,
          moduleIndex: todaySession.moduleIndex,
          status: todaySession.status,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        hasPendingRequest: false,
        status: wasRejected ? "rejected" : null,
        batchId: wasRejected ? session.pendingReschedule.batchId : null,
        viewMode: wasRejected ? session.pendingReschedule.viewMode : null,
        requestedAt: wasRejected ? session.pendingReschedule.requestedAt : null,
        reviewNotes: wasRejected
          ? session.pendingReschedule.reviewNotes || ""
          : null,
        reviewedAt: wasRejected ? session.pendingReschedule.reviewedAt : null,
        swapCandidate,
      },
    });
  } catch (error) {
    console.error("❌ [Check Pending Reschedule API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في التحقق من حالة الطلب",
        error: error.message,
      },
      { status: 500 },
    );
  }
}