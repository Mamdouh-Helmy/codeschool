import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../models/Student";
import User from "../../models/User";
import { generateEnrollmentNumber } from "@/utils/enrollmentGenerator";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function normalizeGender(gender) {
  if (!gender) return "male";
  const lower = String(gender).toLowerCase().trim();
  if (["male", "female", "other"].includes(lower)) return lower;
  return "male";
}

function nullIfEmpty(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function buildCreditStats(query) {
  const base = { isDeleted: false };
  return Promise.all([
    Student.countDocuments({ ...query, "creditSystem.currentPackage": { $ne: null } }),
    Student.countDocuments({ ...query, "creditSystem.status": "active" }),
    Student.countDocuments({ ...query, "creditSystem.exceptions": { $elemMatch: { type: "freeze", status: "active" } } }),
    Student.countDocuments({ ...query, "creditSystem.status": "expired" }),
    Student.countDocuments({ ...query, "creditSystem.currentPackage": null }),
    Student.countDocuments({ ...query, "creditSystem.status": "active", "creditSystem.currentPackage.remainingHours": { $lte: 5, $gt: 0 } }),
    Student.countDocuments({ isDeleted: false, "academicInfo.groupIds": { $exists: true, $not: { $size: 0 } } }),
    Student.countDocuments({ isDeleted: false, $or: [{ "academicInfo.groupIds": { $exists: false } }, { "academicInfo.groupIds": { $size: 0 } }] }),
  ]).then(([totalWithPackage, totalActive, totalFrozen, totalExpired, totalNoPackage, lowBalance, inGroup, notInGroup]) => ({
    creditStats: { totalWithPackage, totalActive, totalFrozen, totalExpired, totalNoPackage, lowBalance },
    groupStats:  { inGroup, notInGroup },
  }));
}

function formatStudent(student) {
  const cs  = student.creditSystem  || { currentPackage: null, exceptions: [], usageHistory: [], stats: {}, status: "no_package" };
  const pkg = cs.currentPackage || null;
  const activeExceptions = (cs.exceptions || []).filter(e => e.status === "active");

  return {
    id:               student._id,
    _id:              student._id,
    enrollmentNumber: student.enrollmentNumber,
    personalInfo: {
      ...student.personalInfo,
      nickname: {
        ar: student.personalInfo?.nickname?.ar || null,
        en: student.personalInfo?.nickname?.en || null,
      },
    },
    guardianInfo: {
      ...student.guardianInfo,
      nickname: {
        ar: student.guardianInfo?.nickname?.ar || null,
        en: student.guardianInfo?.nickname?.en || null,
      },
    },
    enrollmentInfo:           student.enrollmentInfo,
    academicInfo:             student.academicInfo,
    communicationPreferences: student.communicationPreferences,
    creditSystem: {
      currentPackage: pkg ? {
        ...pkg,
        totalHours:     pkg.totalHours     || 0,
        remainingHours: pkg.remainingHours || 0,
        status:         pkg.status         || "active",
      } : null,
      packagesHistory: cs.packagesHistory || [],
      exceptions:      cs.exceptions      || [],
      usageHistory:    cs.usageHistory    || [],
      stats: {
        totalHoursPurchased:   cs.stats?.totalHoursPurchased   || 0,
        totalHoursUsed:        cs.stats?.totalHoursUsed        || 0,
        totalHoursRemaining:   cs.stats?.totalHoursRemaining   || 0,
        totalSessionsAttended: cs.stats?.totalSessionsAttended || 0,
        totalExceptions:       cs.stats?.totalExceptions       || 0,
        activeExceptions:      cs.stats?.activeExceptions      || 0,
        lastPackagePurchase:   cs.stats?.lastPackagePurchase,
        lastUsageDate:         cs.stats?.lastUsageDate,
      },
      status: cs.status || "no_package",
    },
    creditInfo: {
      hasPackage:            !!pkg,
      packageType:           pkg?.packageType,
      totalHours:            pkg?.totalHours           || 0,
      usedHours:             cs.stats?.totalHoursUsed  || 0,
      remainingHours:        pkg?.remainingHours       || 0,
      status:                cs.status                 || "no_package",
      hasActiveFreeze:       activeExceptions.some(e => e.type === "freeze"),
      activeExceptionsCount: activeExceptions.length,
      packageEndDate:        pkg?.endDate,
      usagePercentage: pkg?.totalHours
        ? Math.round(((cs.stats?.totalHoursUsed || 0) / pkg.totalHours) * 100)
        : 0,
    },
    inGroup:     (student.academicInfo?.groupIds?.length || 0) > 0,
    groupCount:  student.academicInfo?.groupIds?.length || 0,
    metadata:    student.metadata,
    createdAt:   student.metadata?.createdAt,
    authUserId:  student.authUserId,
    whatsappStatus: student.metadata?.whatsappStatus || "pending",
    language:    student.communicationPreferences?.preferredLanguage || "ar",
  };
}

// ─── GET /api/allStudents ──────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page         = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit        = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const status       = searchParams.get("status");
    const search       = searchParams.get("search")?.trim();
    const level        = searchParams.get("level");
    const source       = searchParams.get("source");
    const creditStatus = searchParams.get("creditStatus");
    const inGroup      = searchParams.get("inGroup"); // "true" | "false" | null

    // ── Build query ────────────────────────────────────────────────────────
    const query = { isDeleted: false };

    if (status) query["enrollmentInfo.status"] = status;
    if (level)  query["academicInfo.level"]     = level;
    if (source) query["enrollmentInfo.source"]  = source;

    // inGroup filter
    if (inGroup === "true") {
      query["academicInfo.groupIds"] = { $exists: true, $not: { $size: 0 } };
    } else if (inGroup === "false") {
      query.$or = [
        { "academicInfo.groupIds": { $exists: false } },
        { "academicInfo.groupIds": { $size: 0 } },
      ];
    }

    // Credit status filter
    if (creditStatus) {
      switch (creditStatus) {
        case "active":
          query["creditSystem.status"] = "active";
          query["creditSystem.currentPackage.remainingHours"] = { $gt: 5 };
          break;
        case "low":
          query["creditSystem.status"] = "active";
          query["creditSystem.currentPackage.remainingHours"] = { $lte: 5, $gt: 0 };
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
      }
    }

    // Text search — merges with existing $or safely via $and
    if (search) {
      const searchOr = [
        { "personalInfo.fullName":       { $regex: search, $options: "i" } },
        { "personalInfo.nickname.ar":    { $regex: search, $options: "i" } },
        { "personalInfo.nickname.en":    { $regex: search, $options: "i" } },
        { "personalInfo.email":          { $regex: search, $options: "i" } },
        { "personalInfo.phone":          { $regex: search, $options: "i" } },
        { "personalInfo.nationalId":     { $regex: search, $options: "i" } },
        { "guardianInfo.name":           { $regex: search, $options: "i" } },
        { "guardianInfo.nickname.ar":    { $regex: search, $options: "i" } },
        { "guardianInfo.nickname.en":    { $regex: search, $options: "i" } },
        { "guardianInfo.phone":          { $regex: search, $options: "i" } },
        { "guardianInfo.whatsappNumber": { $regex: search, $options: "i" } },
        { enrollmentNumber:              { $regex: search, $options: "i" } },
      ];

      if (query.$or) {
        // inGroup=false already set $or — wrap both in $and
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    // ── Run count + find in parallel ───────────────────────────────────────
    const skip = (page - 1) * limit;

    const [totalStudents, students, { creditStats, groupStats }] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .populate("authUserId",             "name email role")
        .populate("metadata.createdBy",     "name email")
        .populate("enrollmentInfo.referredBy", "personalInfo.fullName enrollmentNumber")
        .sort({ "metadata.createdAt": -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      buildCreditStats(query),
    ]);

    const totalPages = Math.ceil(totalStudents / limit) || 1;

    return NextResponse.json({
      success: true,
      data:        students.map(formatStudent),
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
    console.error("❌ GET /api/allStudents:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch students", error: error.message },
      { status: 500 }
    );
  }
}

// ─── POST /api/allStudents ─────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();

    // ── Sanitize input ─────────────────────────────────────────────────────
    const customMessages = {
      firstMessage:  body.whatsappCustomMessages?.firstMessage  || "",
      secondMessage: body.whatsappCustomMessages?.secondMessage || "",
    };

    const cleanData = {
      ...body,
      authUserId: nullIfEmpty(body.authUserId),
      personalInfo: {
        ...body.personalInfo,
        gender:     normalizeGender(body.personalInfo?.gender),
        nationalId: nullIfEmpty(body.personalInfo?.nationalId),
        nickname: {
          ar: body.personalInfo?.nickname?.ar || "",
          en: body.personalInfo?.nickname?.en || "",
        },
      },
      guardianInfo: {
        ...body.guardianInfo,
        nickname: {
          ar: body.guardianInfo?.nickname?.ar || "",
          en: body.guardianInfo?.nickname?.en || "",
        },
      },
      enrollmentInfo: {
        ...body.enrollmentInfo,
        referredBy: nullIfEmpty(body.enrollmentInfo?.referredBy),
      },
    };

    // ── Validate authUserId if provided ────────────────────────────────────
    if (cleanData.authUserId) {
      if (!mongoose.Types.ObjectId.isValid(cleanData.authUserId)) {
        return NextResponse.json(
          { success: false, message: "Invalid authUserId format" },
          { status: 400 }
        );
      }
      const [userExists, existingStudent] = await Promise.all([
        User.findById(cleanData.authUserId).select("_id").lean(),
        Student.findOne({ authUserId: cleanData.authUserId, isDeleted: false }).select("_id").lean(),
      ]);
      if (!userExists) {
        return NextResponse.json(
          { success: false, message: "User not found with provided authUserId" },
          { status: 404 }
        );
      }
      if (existingStudent) {
        return NextResponse.json(
          { success: false, message: "User already has a student profile", existingStudentId: existingStudent._id },
          { status: 409 }
        );
      }
    }

    // ── Generate enrollment number ─────────────────────────────────────────
    const enrollmentNumber = await generateEnrollmentNumber();
    const whatsappMode     = process.env.WHATSAPP_API_TOKEN ? "production" : "simulation";

    const studentDataToSave = {
      ...cleanData,
      enrollmentNumber,
      metadata: {
        createdBy:          adminUser.id,
        lastModifiedBy:     adminUser.id,
        createdAt:          new Date(),
        updatedAt:          new Date(),
        whatsappWelcomeSent:     false,
        whatsappInteractiveSent: false,
        whatsappButtons: [
          { id: "arabic_btn",  title: "العربية 🇸🇦" },
          { id: "english_btn", title: "English 🇺🇸" },
        ],
        whatsappStatus:           "pending",
        whatsappMode,
        whatsappMessagesCount:    0,
        whatsappTotalMessages:    0,
        whatsappLanguageSelected: false,
        whatsappLanguageSelection: null,
        whatsappButtonSelected:   null,
        whatsappResponseReceived: false,
        whatsappLanguageConfirmed: false,
        whatsappConfirmationSent: false,
        whatsappConversationId:   `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      },
    };

    // ── Save ───────────────────────────────────────────────────────────────
    let savedStudent;
    try {
      savedStudent = await new Student(studentDataToSave).save();
    } catch (saveError) {
      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyPattern || {})[0] || "unknown";
        return NextResponse.json(
          { success: false, message: `Duplicate value: ${field}`, field, value: saveError.keyValue?.[field] },
          { status: 409 }
        );
      }
      if (saveError.name === "ValidationError") {
        const errors = Object.values(saveError.errors).map(e => ({ field: e.path, message: e.message }));
        return NextResponse.json({ success: false, message: "Validation failed", errors }, { status: 400 });
      }
      throw saveError;
    }

    // ── Fire-and-forget: WhatsApp welcome ──────────────────────────────────
    const guardianPhone = savedStudent.guardianInfo?.whatsappNumber || savedStudent.guardianInfo?.phone || null;

    setImmediate(async () => {
      try {
        const { wapilotService } = await import("../../services/wapilot-service");
        const result = await wapilotService.sendWelcomeMessages(
          savedStudent._id,
          savedStudent.personalInfo.fullName,
          savedStudent.personalInfo.whatsappNumber,
          guardianPhone,
          customMessages.firstMessage,
          customMessages.secondMessage
        );
        const status = result.success ? "sent" : result.skipped ? "skipped" : "failed";
        await Student.findByIdAndUpdate(savedStudent._id, {
          $set: {
            "metadata.whatsappWelcomeSent":     result.success,
            "metadata.whatsappInteractiveSent": result.success,
            "metadata.whatsappStatus":          status,
            "metadata.whatsappSentAt":          new Date(),
            "metadata.updatedAt":               new Date(),
          },
        });
      } catch (err) {
        await Student.findByIdAndUpdate(savedStudent._id, {
          $set: {
            "metadata.whatsappStatus": "error",
            "metadata.whatsappError":  err.message,
            "metadata.updatedAt":      new Date(),
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Student created successfully",
      data: {
        id:               savedStudent._id,
        enrollmentNumber: savedStudent.enrollmentNumber,
        fullName:         savedStudent.personalInfo.fullName,
      },
    }, { status: 201 });

  } catch (error) {
    console.error("❌ POST /api/allStudents:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "unknown";
      return NextResponse.json(
        { success: false, message: `Duplicate value: ${field}`, field },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create student" },
      { status: 500 }
    );
  }
}