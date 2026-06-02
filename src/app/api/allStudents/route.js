import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../models/Student";
import User from "../../models/User";
import { generateEnrollmentNumber } from "@/utils/enrollmentGenerator";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

function normalizeGender(gender) {
  if (!gender) return "male";
  const lower = String(gender).toLowerCase().trim();
  if (lower === "male" || lower === "female" || lower === "other") return lower;
  return "male";
}

function nullIfEmpty(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

// ✅ POST: إنشاء طالب جديد (unchanged)
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    const adminUser = authCheck.user;
    await connectDB();
    const studentData = await req.json();

    const customMessages = {
      firstMessage: studentData.whatsappCustomMessages?.firstMessage || "",
      secondMessage: studentData.whatsappCustomMessages?.secondMessage || "",
    };

    const cleanData = {
      ...studentData,
      authUserId: studentData.authUserId?.trim() !== "" ? studentData.authUserId : null,
      personalInfo: {
        ...studentData.personalInfo,
        gender: normalizeGender(studentData.personalInfo?.gender),
        nationalId: nullIfEmpty(studentData.personalInfo?.nationalId),
        nickname: {
          ar: studentData.personalInfo?.nickname?.ar || "",
          en: studentData.personalInfo?.nickname?.en || "",
        },
      },
      guardianInfo: {
        ...studentData.guardianInfo,
        nickname: {
          ar: studentData.guardianInfo?.nickname?.ar || "",
          en: studentData.guardianInfo?.nickname?.en || "",
        },
      },
      enrollmentInfo: {
        ...studentData.enrollmentInfo,
        referredBy: studentData.enrollmentInfo?.referredBy?.trim() !== "" ? studentData.enrollmentInfo.referredBy : null,
      },
    };

    if (cleanData.authUserId) {
      const userExists = await User.findById(cleanData.authUserId);
      if (!userExists) {
        return NextResponse.json({ success: false, message: "User not found with provided authUserId" }, { status: 404 });
      }
      const existingStudent = await Student.findOne({ authUserId: cleanData.authUserId, isDeleted: false });
      if (existingStudent) {
        return NextResponse.json({ success: false, message: "User already has a student profile", existingStudentId: existingStudent._id }, { status: 409 });
      }
    }

    const enrollmentNumber = await generateEnrollmentNumber();
    const whatsappMode = process.env.WHATSAPP_API_TOKEN ? "production" : "simulation";
    const whatsappButtons = [
      { id: "arabic_btn", title: "العربية 🇸🇦" },
      { id: "english_btn", title: "English 🇺🇸" },
    ];

    const studentDataToSave = {
      ...cleanData,
      enrollmentNumber,
      metadata: {
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        whatsappWelcomeSent: false,
        whatsappInteractiveSent: false,
        whatsappButtons,
        whatsappStatus: "pending",
        whatsappMode,
        whatsappMessagesCount: 0,
        whatsappTotalMessages: 0,
        whatsappLanguageSelected: false,
        whatsappLanguageSelection: null,
        whatsappButtonSelected: null,
        whatsappResponseReceived: false,
        whatsappLanguageConfirmed: false,
        whatsappConfirmationSent: false,
        whatsappConversationId: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        whatsappGuardianNotified: false,
        whatsappGuardianPhone: null,
        whatsappGuardianNotificationSent: false,
        whatsappGuardianNotificationAt: null,
      },
    };

    let savedStudent;
    try {
      const newStudent = new Student(studentDataToSave);
      savedStudent = await newStudent.save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyPattern)[0];
        return NextResponse.json({ success: false, message: `Data already exists: ${field}`, field, value: saveError.keyValue[field] }, { status: 409 });
      }
      if (saveError.name === "ValidationError") {
        const errors = Object.values(saveError.errors || {}).map((err) => ({ field: err.path, message: err.message }));
        return NextResponse.json({ success: false, message: "Validation failed", errors }, { status: 400 });
      }
      throw saveError;
    }

    const guardianPhone = savedStudent.guardianInfo?.whatsappNumber || savedStudent.guardianInfo?.phone || null;

    setTimeout(async () => {
      try {
        const { wapilotService } = await import("../../services/wapilot-service");
        const whatsappResult = await wapilotService.sendWelcomeMessages(
          savedStudent._id, savedStudent.personalInfo.fullName,
          savedStudent.personalInfo.whatsappNumber, guardianPhone,
          customMessages.firstMessage, customMessages.secondMessage
        );
        const status = whatsappResult.success ? "sent" : whatsappResult.skipped ? "skipped" : "failed";
        await Student.findByIdAndUpdate(savedStudent._id, {
          $set: {
            "metadata.whatsappWelcomeSent": whatsappResult.success,
            "metadata.whatsappInteractiveSent": whatsappResult.success,
            "metadata.whatsappStatus": whatsappResult.skipped ? "skipped" : status,
            "metadata.whatsappSentAt": new Date(),
            "metadata.updatedAt": new Date(),
          },
        });
      } catch (err) {
        await Student.findByIdAndUpdate(savedStudent._id, {
          $set: { "metadata.whatsappStatus": "error", "metadata.whatsappError": err.message, "metadata.updatedAt": new Date() },
        });
      }
    }, 2000);

    return NextResponse.json({
      success: true,
      message: "Student created successfully",
      data: { student: { id: savedStudent._id, enrollmentNumber: savedStudent.enrollmentNumber, fullName: savedStudent.personalInfo.fullName } },
    }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "unknown";
      return NextResponse.json({ success: false, message: `Data already exists: ${field}`, field }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message || "Failed to create student" }, { status: 500 });
  }
}

// ✅ GET: الحصول على جميع الطلاب مع فلتر inGroup جديد
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page        = parseInt(searchParams.get("page")  || "1");
    const limit       = parseInt(searchParams.get("limit") || "10");
    const status      = searchParams.get("status");
    const search      = searchParams.get("search");
    const level       = searchParams.get("level");
    const source      = searchParams.get("source");
    const creditStatus = searchParams.get("creditStatus");
    const inGroup     = searchParams.get("inGroup"); // "true" | "false" | ""

    // ── Base query ──────────────────────────────────────────────
    const query = { isDeleted: false };

    if (status)  query["enrollmentInfo.status"]  = status;
    if (level)   query["academicInfo.level"]      = level;
    if (source)  query["enrollmentInfo.source"]   = source;

    // ── inGroup filter ──────────────────────────────────────────
    // academicInfo.groupIds is an array; students in a group have at least one entry
    if (inGroup === "true") {
      query["academicInfo.groupIds"] = { $exists: true, $not: { $size: 0 } };
    } else if (inGroup === "false") {
      query.$or = [
        { "academicInfo.groupIds": { $exists: false } },
        { "academicInfo.groupIds": { $size: 0 } },
      ];
    }

    // ── Credit status filter ────────────────────────────────────
    if (creditStatus) {
      switch (creditStatus) {
        case "active":
          query["creditSystem.status"] = "active";
          query["creditSystem.currentPackage.remainingHours"] = { $gt: 5 };
          break;
        case "frozen":
          query["creditSystem.exceptions"] = { $elemMatch: { type: "freeze", status: "active" } };
          break;
        case "expired":
          query["creditSystem.status"] = "expired";
          break;
        case "completed":
          query["creditSystem.status"] = "completed";
          break;
        case "no_package":
          query["creditSystem.currentPackage"] = null;
          break;
        case "low":
          query["creditSystem.status"] = "active";
          query["creditSystem.currentPackage.remainingHours"] = { $lte: 5, $gt: 0 };
          break;
      }
    }

    // ── Text search ─────────────────────────────────────────────
    if (search) {
      const searchOr = [
        { "personalInfo.fullName":        { $regex: search, $options: "i" } },
        { "personalInfo.nickname.ar":     { $regex: search, $options: "i" } },
        { "personalInfo.nickname.en":     { $regex: search, $options: "i" } },
        { "personalInfo.email":           { $regex: search, $options: "i" } },
        { enrollmentNumber:               { $regex: search, $options: "i" } },
        { "personalInfo.phone":           { $regex: search, $options: "i" } },
        { "personalInfo.nationalId":      { $regex: search, $options: "i" } },
        { "guardianInfo.name":            { $regex: search, $options: "i" } },
        { "guardianInfo.nickname.ar":     { $regex: search, $options: "i" } },
        { "guardianInfo.nickname.en":     { $regex: search, $options: "i" } },
        { "guardianInfo.phone":           { $regex: search, $options: "i" } },
        { "guardianInfo.whatsappNumber":  { $regex: search, $options: "i" } },
      ];
      // merge with existing $or from inGroup=false if present
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    // ── Pagination ───────────────────────────────────────────────
    const totalStudents = await Student.countDocuments(query);
    const totalPages    = Math.ceil(totalStudents / limit);
    const skip          = (page - 1) * limit;

    const students = await Student.find(query)
      .populate("authUserId", "name email role")
      .populate("metadata.createdBy", "name email")
      .populate("enrollmentInfo.referredBy", "personalInfo.fullName enrollmentNumber")
      .sort({ "metadata.createdAt": -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ── Format response ──────────────────────────────────────────
    const formattedStudents = students.map((student) => {
      const creditSystem  = student.creditSystem  || { currentPackage: null, exceptions: [], usageHistory: [], stats: {}, status: "no_package" };
      const currentPackage = creditSystem.currentPackage || null;
      const activeExceptions = (creditSystem.exceptions || []).filter((e) => e.status === "active");

      return {
        id:               student._id,
        _id:              student._id,
        enrollmentNumber: student.enrollmentNumber,
        personalInfo:     { ...student.personalInfo, nickname: { ar: student.personalInfo?.nickname?.ar || null, en: student.personalInfo?.nickname?.en || null } },
        guardianInfo:     { ...student.guardianInfo,  nickname: { ar: student.guardianInfo?.nickname?.ar  || null, en: student.guardianInfo?.nickname?.en  || null } },
        enrollmentInfo:   student.enrollmentInfo,
        academicInfo:     student.academicInfo,
        communicationPreferences: student.communicationPreferences,
        creditSystem: {
          currentPackage: currentPackage ? {
            ...currentPackage,
            totalHours:     currentPackage.totalHours     || 0,
            remainingHours: currentPackage.remainingHours || 0,
            status:         currentPackage.status         || "active",
          } : null,
          packagesHistory: creditSystem.packagesHistory || [],
          exceptions:      creditSystem.exceptions      || [],
          usageHistory:    creditSystem.usageHistory    || [],
          stats: {
            totalHoursPurchased:   creditSystem.stats?.totalHoursPurchased   || 0,
            totalHoursUsed:        creditSystem.stats?.totalHoursUsed        || 0,
            totalHoursRemaining:   creditSystem.stats?.totalHoursRemaining   || 0,
            totalSessionsAttended: creditSystem.stats?.totalSessionsAttended || 0,
            totalExceptions:       creditSystem.stats?.totalExceptions       || 0,
            activeExceptions:      creditSystem.stats?.activeExceptions      || 0,
            lastPackagePurchase:   creditSystem.stats?.lastPackagePurchase,
            lastUsageDate:         creditSystem.stats?.lastUsageDate,
          },
          status: creditSystem.status || "no_package",
        },
        creditInfo: {
          hasPackage:           !!currentPackage,
          packageType:          currentPackage?.packageType,
          totalHours:           currentPackage?.totalHours           || 0,
          usedHours:            creditSystem.stats?.totalHoursUsed   || 0,
          remainingHours:       currentPackage?.remainingHours       || 0,
          status:               creditSystem.status                  || "no_package",
          hasActiveFreeze:      activeExceptions.some((e) => e.type === "freeze"),
          activeExceptionsCount: activeExceptions.length,
          packageEndDate:       currentPackage?.endDate,
          usagePercentage:      currentPackage?.totalHours
            ? Math.round(((creditSystem.stats?.totalHoursUsed || 0) / currentPackage.totalHours) * 100)
            : 0,
        },
        // group membership shorthand for UI
        inGroup: (student.academicInfo?.groupIds?.length || 0) > 0,
        groupCount: student.academicInfo?.groupIds?.length || 0,
        metadata:        student.metadata,
        createdAt:       student.metadata?.createdAt,
        authUserId:      student.authUserId,
        whatsappStatus:  student.metadata?.whatsappStatus || "pending",
        language:        student.communicationPreferences?.preferredLanguage || "ar",
      };
    });

    // ── Aggregate stats ──────────────────────────────────────────
    const creditStats = {
      totalWithPackage: await Student.countDocuments({ ...query, "creditSystem.currentPackage": { $ne: null } }),
      totalActive:      await Student.countDocuments({ ...query, "creditSystem.status": "active" }),
      totalFrozen:      await Student.countDocuments({ ...query, "creditSystem.exceptions": { $elemMatch: { type: "freeze", status: "active" } } }),
      totalExpired:     await Student.countDocuments({ ...query, "creditSystem.status": "expired" }),
      totalNoPackage:   await Student.countDocuments({ ...query, "creditSystem.currentPackage": null }),
      lowBalance:       await Student.countDocuments({ ...query, "creditSystem.status": "active", "creditSystem.currentPackage.remainingHours": { $lte: 5, $gt: 0 } }),
    };

    const groupStats = {
      inGroup:    await Student.countDocuments({ isDeleted: false, "academicInfo.groupIds": { $exists: true, $not: { $size: 0 } } }),
      notInGroup: await Student.countDocuments({ isDeleted: false, $or: [{ "academicInfo.groupIds": { $exists: false } }, { "academicInfo.groupIds": { $size: 0 } }] }),
    };

    return NextResponse.json({
      success: true,
      data: formattedStudents,
      creditStats,
      groupStats,
      pagination: {
        page,
        limit,
        totalStudents,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch students", error: error.message }, { status: 500 });
  }
}