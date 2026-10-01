// /app/api/groups/[id]/add-student/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Student from "../../../../models/Student";
import Course from "../../../../models/Course";
import { onStudentAddedToGroup } from "../../../../services/groupAutomation";
import { requireAdmin } from "@/utils/authMiddleware";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

// ✅ بناء لينك الخريطة للجروب (Offline)
function buildMapsLink(group) {
  const loc = group?.locationDetails || {};
  if (loc.lat != null && loc.lng != null) {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  }
  if (loc.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
  }
  if (loc.placeName || group?.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.placeName || group.location)}`;
  }
  return "";
}

// ✅ التحقق من أهلية الطالب للانضمام لجروب (لازم يكون عنده رصيد)
function checkStudentCreditEligibility(student) {
  if (!student) {
    return { eligible: false, reason: "student_not_found" };
  }

  const pkg = student.creditSystem?.currentPackage;
  if (!pkg) {
    return { eligible: false, reason: "no_package", remainingHours: 0 };
  }

  const remaining = pkg.remainingHours || 0;
  if (remaining <= 0) {
    return { eligible: false, reason: "zero_balance", remainingHours: 0 };
  }

  return { eligible: true, remainingHours: remaining };
}

// ✅ رسالة خطأ واضحة للطالب/الأدمن حسب السبب
function getIneligibilityMessage(reason, isRTL = true) {
  const messages = {
    no_package: isRTL
      ? "الطالب معندهوش باقة سارية — مينفعش نضيفه لجروب"
      : "Student has no active package — cannot be added to a group",
    zero_balance: isRTL
      ? "رصيد الطالب صفر — مينفعش نضيفه لجروب"
      : "Student's credit is zero — cannot be added to a group",
    student_not_found: isRTL ? "الطالب غير موجود" : "Student not found",
  };
  return messages[reason] || (isRTL ? "الطالب غير مؤهل" : "Student not eligible");
}

// ═══════════════════════════════════════════════════════════════════════════
// GET — قائمة الطلاب المؤهلين للإضافة للجروب
// ═══════════════════════════════════════════════════════════════════════════
//
// Query params:
//   ?search=xxx   → ابحث بالاسم / الإيميل / رقم القيد / الهاتف
//   ?limit=500    → حد أقصى للنتائج (default 500, max 1000)
//
// الفلاتر التلقائية:
//   1. الطالب مش محذوف (isDeleted: false)
//   2. الطالب مش موجود في الجروب بالفعل
//   3. الطالب عنده currentPackage
//   4. الطالب عنده remainingHours > 0
// ═══════════════════════════════════════════════════════════════════════════
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id: groupId } = await params;
    const { searchParams } = new URL(req.url);
    const searchQuery = (searchParams.get("search") || "").trim();
    const limitParam = parseInt(searchParams.get("limit") || "500", 10);

    // ✅ نجيب الجروب عشان نستثني الطلاب اللي فيه بالفعل
    const group = await Group.findById(groupId).select("students").lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    // الطلاب الموجودين في الجروب — نستثنيهم من القائمة
    const existingStudentIds = (group.students || [])
      .map((s) => s?._id || s)
      .filter(Boolean);

    // ═══════════════════════════════════════════════════════════════════
    // ✅ الفلتر الأساسي — لازم الطالب يكون مؤهل للإضافة
    // ═══════════════════════════════════════════════════════════════════
    const filter = {
      isDeleted: false,

      // ✅ استبعاد الطلاب اللي في الجروب بالفعل
      ...(existingStudentIds.length > 0 && {
        _id: { $nin: existingStudentIds },
      }),

      // ✅ فلتر الرصيد — الطالب لازم يكون عنده باكدج فيها ساعات متبقية
      //    المفتاح "creditSystem.currentPackage.remainingHours" بيتحقق
      //    تلقائيًا من إن currentPackage موجود (مش null) + إن remainingHours > 0
      "creditSystem.currentPackage.remainingHours": { $gt: 0 },
    };

    // ✅ البحث
    if (searchQuery.length >= 2) {
      filter.$or = [
        { "personalInfo.fullName": { $regex: searchQuery, $options: "i" } },
        { "personalInfo.email": { $regex: searchQuery, $options: "i" } },
        { enrollmentNumber: { $regex: searchQuery, $options: "i" } },
        { "personalInfo.phone": { $regex: searchQuery, $options: "i" } },
        { "personalInfo.whatsappNumber": { $regex: searchQuery, $options: "i" } },
      ];
    }

    const limit = Math.min(Math.max(limitParam, 1), 1000);
    const sortBy =
      searchQuery.length >= 2
        ? { "personalInfo.fullName": 1 }
        : { createdAt: -1 };

    const students = await Student.find(filter)
      .select(
        // ✅ بنجيب كل الكائنات اللي الفرونت بيستخدمها عشان مايحتاجش تعديل
        "_id enrollmentNumber studentType " +
          "personalInfo guardianInfo communicationPreferences " +
          "creditSystem.currentPackage",
      )
      .sort(sortBy)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: students.map((s) => ({
        _id: s._id,
        // ✅ نفس شكل الـ allStudents عشان الفرونت يشتغل بدون تعديل في العرض
        personalInfo: s.personalInfo || {},
        guardianInfo: s.guardianInfo || {},
        communicationPreferences: s.communicationPreferences || {
          preferredLanguage: "ar",
        },
        enrollmentNumber: s.enrollmentNumber || "",
        studentType: s.studentType || "kids",
        isAdult: (s.studentType || "kids") === "adults",
        // ✅ بيانات الرصيد للعرض
        remainingHours: s.creditSystem?.currentPackage?.remainingHours || 0,
        packageName: s.creditSystem?.currentPackage?.packageName || "",
        packageType: s.creditSystem?.currentPackage?.packageType || "",
      })),
      meta: {
        count: students.length,
        mode: searchQuery.length >= 2 ? "search" : "list",
        query: searchQuery,
        filterApplied: {
          creditRequired: true,
          minRemainingHours: 1,
          excludedGroupMembers: existingStudentIds.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ [Add-Student GET]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST — إضافة طالب للجروب
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id } = await params;
    const groupId = id;

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const {
      studentId,
      sendWhatsApp = true,
      studentMessage = null,
      guardianMessage = null,
      moduleOverviewMessage = null,
      // ✅ NEW: الأدمن يقدر يتخطى فحص الرصيد لو عايز (حالات استثنائية)
      force = false,
    } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
        { status: 400 },
      );
    }

    // ✅ populate courseId مع curriculum كاملاً
    const group = await Group.findById(groupId)
      .populate({
        path: "courseId",
        select: "title level curriculum description",
      })
      .populate("students", "_id");

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    // ═══════════════════════════════════════════════════════════════════
    // ✅ NEW: فحص الرصيد — نرفض الإضافة لو مفيش باكدج أو الرصيد صفر
    //    مالم الأدمن يبعت force: true (لحالات استثنائية)
    // ═══════════════════════════════════════════════════════════════════
    if (!force) {
      const creditCheck = checkStudentCreditEligibility(student);

      if (!creditCheck.eligible) {
        return NextResponse.json(
          {
            success: false,
            error: getIneligibilityMessage(creditCheck.reason, true),
            reason: creditCheck.reason,
            remainingHours: creditCheck.remainingHours ?? 0,
            hint: "لو عايز تضيفه بالرغم من كده، ابعت force: true",
          },
          { status: 400 },
        );
      }
    } else {
      console.log(
        `⚠️ [add-student] force=true — skipping credit check for student ${studentId}`,
      );
    }

    const studentObjectIds = (group.students || []).map((s) => {
      const sid = s._id || s.id || s;
      return typeof sid === "object" ? sid.toString() : String(sid);
    });

    if (studentObjectIds.includes(studentId.toString())) {
      return NextResponse.json(
        { success: false, error: "Student is already in this group" },
        { status: 400 },
      );
    }

    const currentCount = group.students?.length || 0;
    const maxStudents = group.maxStudents || 0;

    if (currentCount >= maxStudents) {
      return NextResponse.json(
        { success: false, error: "Group is full", currentCount, maxStudents },
        { status: 400 },
      );
    }

    // ✅ استخرج module data من الكورس
    let moduleTitle = "";
    let moduleDescription = "";

    const course = group.courseId;

    if (course?.curriculum?.length > 0) {
      const firstModule = course.curriculum[0];
      moduleTitle = firstModule?.title || "";
      moduleDescription = firstModule?.description || "";
      console.log(`✅ Module data from courseId.curriculum[0]:`);
      console.log(`   Title: ${moduleTitle}`);
      console.log(`   Description: ${moduleDescription?.substring(0, 80)}`);
    } else if (group.courseSnapshot?.curriculum?.length > 0) {
      const firstModule = group.courseSnapshot.curriculum[0];
      moduleTitle = firstModule?.title || "";
      moduleDescription = firstModule?.description || "";
      console.log(`✅ Module data from courseSnapshot.curriculum[0] (fallback):`);
      console.log(`   Title: ${moduleTitle}`);
    } else {
      const courseId = group.courseId?._id || group.courseId;
      if (courseId) {
        try {
          const courseDoc = await Course.findById(courseId)
            .select("curriculum")
            .lean();
          if (courseDoc?.curriculum?.length > 0) {
            const firstModule = courseDoc.curriculum[0];
            moduleTitle = firstModule?.title || "";
            moduleDescription = firstModule?.description || "";
            console.log(`✅ Module data from direct Course query (last fallback):`);
            console.log(`   Title: ${moduleTitle}`);
          }
        } catch (courseErr) {
          console.warn(`⚠️ Could not fetch course for module data:`, courseErr.message);
        }
      }
    }

    // ✅ NEW: detect offline + build location data
    const isOffline = group.deliveryMode === "offline";
    const loc = group.locationDetails || {};
    const placeName = loc.placeName || group.location || "";
    const address = loc.address || loc.extraDetails || "";
    const mapsLink = isOffline ? buildMapsLink(group) : "";

    console.log(`\n✅ VALIDATION PASSED ==========`);
    console.log(`Group: ${group.name} (${group.code})`);
    console.log(`Student: ${student.personalInfo?.fullName}`);
    console.log(`Delivery Mode: ${group.deliveryMode} (isOffline: ${isOffline})`);
    console.log(`moduleTitle: "${moduleTitle}"`);
    console.log(`moduleDescription: "${moduleDescription?.substring(0, 80)}"`);
    if (isOffline) {
      console.log(`📍 placeName: "${placeName}"`);
      console.log(`📌 address: "${address}"`);
      console.log(`🗺️ mapsLink: "${mapsLink}"`);
    }

    // ✅ أضف الطالب للـ group
    await Group.findByIdAndUpdate(
      groupId,
      {
        $addToSet: { students: studentId },
        $set: {
          currentStudentsCount: currentCount + 1,
          "metadata.updatedAt": new Date(),
        },
      },
      { new: true },
    );

    let automationResult = null;

    try {
      automationResult = await onStudentAddedToGroup(
        studentId,
        groupId,
        {
          student: studentMessage,
          guardian: guardianMessage,
          moduleOverview: moduleOverviewMessage,
        },
        sendWhatsApp,
        {
          moduleTitle,
          moduleDescription,
          isOffline,
          placeName,
          address,
          mapsLink,
        },
      );

      console.log(`\n✅ AUTOMATION COMPLETED ==========`);
      console.log("Messages Sent:", automationResult.messagesSent);
    } catch (automationError) {
      console.error(`\n❌ AUTOMATION ERROR ==========`);
      console.error(automationError);
      automationResult = {
        success: false,
        error: automationError.message,
        messagesSent: {
          student: false,
          guardian: false,
          moduleOverview: false,
        },
      };
    }

    return NextResponse.json({
      success: true,
      message: "Student added successfully",
      data: {
        group: {
          id: group._id,
          name: group.name,
          code: group.code,
          currentStudentsCount: currentCount + 1,
          maxStudents: group.maxStudents,
          deliveryMode: group.deliveryMode,
          isOffline,
        },
        student: {
          id: student._id,
          name: student.personalInfo?.fullName,
          email: student.personalInfo?.email,
          whatsappNumber: student.personalInfo?.whatsappNumber,
          guardianWhatsappNumber: student.guardianInfo?.whatsappNumber,
          preferredLanguage:
            student.communicationPreferences?.preferredLanguage || "ar",
          gender: student.personalInfo?.gender,
          guardianRelationship: student.guardianInfo?.relationship,
        },
        moduleData: {
          title: moduleTitle,
          description: moduleDescription,
        },
        ...(isOffline && {
          locationData: {
            placeName,
            address,
            mapsLink,
          },
        }),
      },
      automation: automationResult,
    });
  } catch (error) {
    console.error(`\n❌ ERROR IN ADD STUDENT ==========`);
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to add student to group",
        details:
          process.env.NODE_ENV === "development" ? error.toString() : undefined,
      },
      { status: 500 },
    );
  }
}