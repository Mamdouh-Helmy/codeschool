// app/api/students/[id]/credit-hours/adjust/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ─── POST /api/students/[id]/credit-hours/adjust ───────────────────────────────
// body: { direction: "add" | "subtract", hours: Number, reason?: String }
//
// "add"      -> يستخدم Student.addCreditHours (يتطلب وجود currentPackage)
// "subtract" -> يستخدم Student.deductCreditHours (بيرفض لو الرصيد غير كافي)
export async function POST(req, context) {
  try {
    const { id } = await context.params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    if (!validateObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID format" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const direction = body.direction;
    const hours = Number(body.hours);
    const reason = (body.reason || "").trim();

    if (!["add", "subtract"].includes(direction)) {
      return NextResponse.json(
        { success: false, message: "direction must be 'add' or 'subtract'" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(hours) || hours <= 0) {
      return NextResponse.json(
        { success: false, message: "hours must be a positive number" },
        { status: 400 }
      );
    }

    await connectDB();

    const student = await Student.findOne({ _id: id, isDeleted: false });
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    if (!student.creditSystem?.currentPackage) {
      return NextResponse.json(
        {
          success: false,
          message: "Student has no active package. Add a package first.",
          code: "NO_ACTIVE_PACKAGE",
        },
        { status: 400 }
      );
    }

    let result;

    if (direction === "add") {
      result = await student.addCreditHours({
        hours,
        sessionTitle: "Manual adjustment",
        reason: reason || "Manual hours addition by admin",
      });
    } else {
      result = await student.deductCreditHours({
        hours,
        sessionTitle: "Manual adjustment",
        attendanceStatus: "present",
        notes: reason || "Manual hours deduction by admin",
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to adjust hours" },
        { status: 400 }
      );
    }

    student.metadata.lastModifiedBy = authCheck.user.id;
    student.metadata.updatedAt = new Date();
    await student.save();

    const fresh = await Student.findById(id)
      .populate("authUserId", "name email role")
      .populate("metadata.lastModifiedBy", "name email")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message:
          direction === "add"
            ? "Hours added successfully"
            : "Hours deducted successfully",
        remainingHours: result.remainingHours,
        student: {
          id: fresh._id,
          _id: fresh._id,
          personalInfo: fresh.personalInfo,
          guardianInfo: fresh.guardianInfo,
          enrollmentNumber: fresh.enrollmentNumber,
          enrollmentInfo: fresh.enrollmentInfo,
          academicInfo: fresh.academicInfo,
          communicationPreferences: fresh.communicationPreferences,
          creditSystem: fresh.creditSystem,
          creditInfo: {
            hasPackage: !!fresh.creditSystem?.currentPackage,
            remainingHours: result.remainingHours,
            totalHours: fresh.creditSystem?.currentPackage?.totalHours || 0,
            status: fresh.creditSystem?.status || "no_package",
          },
          metadata: fresh.metadata,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ POST /api/students/[id]/credit-hours/adjust:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to adjust credit hours" },
      { status: 500 }
    );
  }
}