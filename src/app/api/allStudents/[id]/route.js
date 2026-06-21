// app/api/allStudents/[id]route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function validateJsonContentType(req) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return NextResponse.json(
      { success: false, message: "Content-Type must be application/json" },
      { status: 415 }
    );
  }
  return null;
}

// Fields that must never be updated by a client request
const IMMUTABLE_FIELDS = new Set([
  "_id",
  "enrollmentNumber",
  "isDeleted",
  "deletedAt",
  "createdAt",
]);

const IMMUTABLE_NESTED = {
  metadata: new Set(["createdAt", "createdBy"]),
};

function stripImmutable(data) {
  const cleaned = { ...data };

  for (const field of IMMUTABLE_FIELDS) {
    delete cleaned[field];
  }

  for (const [parent, fields] of Object.entries(IMMUTABLE_NESTED)) {
    if (cleaned[parent]) {
      cleaned[parent] = { ...cleaned[parent] };
      for (const f of fields) {
        delete cleaned[parent][f];
      }
    }
  }

  return cleaned;
}

// ─── GET /api/allStudents/[id] ─────────────────────────────────────────────────
export async function GET(req, context) {
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

    await connectDB();

    const student = await Student.findOne({ _id: id, isDeleted: false })
      .populate("authUserId",             "name email role")
      .populate("metadata.createdBy",     "name email")
      .populate("metadata.lastModifiedBy","name email");

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student retrieved successfully",
      data: {
        id:               student._id,
        enrollmentNumber: student.enrollmentNumber,
        authUserId:       student.authUserId,
        personalInfo:     student.personalInfo,
        guardianInfo:     student.guardianInfo,
        enrollmentInfo:   student.enrollmentInfo,
        academicInfo:     student.academicInfo,
        communicationPreferences: student.communicationPreferences,
        creditSystem:     student.creditSystem,
        metadata: {
          createdAt:      student.metadata?.createdAt,
          updatedAt:      student.metadata?.updatedAt,
          createdBy:      student.metadata?.createdBy,
          lastModifiedBy: student.metadata?.lastModifiedBy,
        },
        isDeleted: student.isDeleted,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("❌ GET /api/allStudents/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch student", error: error.message },
      { status: 500 }
    );
  }
}

// ─── PUT /api/allStudents/[id] ─────────────────────────────────────────────────
export async function PUT(req, context) {
  try {
    const { id } = await context.params;

    const ctError = validateJsonContentType(req);
    if (ctError) return ctError;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    if (!validateObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID format" },
        { status: 400 }
      );
    }

    await connectDB();

    const body = await req.json();

    // ── Verify student exists ──────────────────────────────────────────────
    const existing = await Student.findOne({ _id: id, isDeleted: false }).select("_id personalInfo.whatsappNumber").lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // ── Strip immutable fields ─────────────────────────────────────────────
    const updateData = stripImmutable(body);

    // ── Coerce empty strings to null for optional ObjectId fields ──────────
    if (updateData.authUserId?.trim?.() === "") updateData.authUserId = null;
    if (updateData.enrollmentInfo?.referredBy?.trim?.() === "") {
      updateData.enrollmentInfo.referredBy = null;
    }

    const whatsappChanged =
      updateData.personalInfo?.whatsappNumber &&
      updateData.personalInfo.whatsappNumber !== existing.personalInfo?.whatsappNumber;

    // ── Apply update ───────────────────────────────────────────────────────
    const updated = await Student.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          ...updateData,
          "metadata.lastModifiedBy": authCheck.user.id,
          "metadata.updatedAt":      new Date(),
        },
      },
      { new: true, runValidators: true, context: "query" }
    )
      .populate("metadata.lastModifiedBy", "name email")
      .populate("authUserId",              "name email");

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student updated successfully",
      data: {
        id:               updated._id,
        enrollmentNumber: updated.enrollmentNumber,
        fullName:         updated.personalInfo.fullName,
        updatedFields:    Object.keys(updateData),
        metadata: {
          lastModifiedBy: updated.metadata?.lastModifiedBy,
          updatedAt:      updated.metadata?.updatedAt,
        },
        whatsappChanged,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PUT /api/allStudents/[id]:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return NextResponse.json(
        { success: false, message: `Duplicate value for field: ${field}`, field, value: error.keyValue?.[field] },
        { status: 409 }
      );
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
      return NextResponse.json(
        { success: false, message: "Validation failed", errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update student", error: error.message },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/allStudents/[id] ──────────────────────────────────────────────
export async function DELETE(req, context) {
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

    await connectDB();

    // Hard delete — permanently removes from DB
    const deleted = await Student.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    console.log(`✅ Student permanently deleted: ${deleted.enrollmentNumber}`);

    return NextResponse.json({
      success: true,
      message: "Student permanently deleted",
      data: {
        id:               deleted._id,
        enrollmentNumber: deleted.enrollmentNumber,
        fullName:         deleted.personalInfo?.fullName,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("❌ DELETE /api/allStudents/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete student", error: error.message },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/allStudents/[id] — restore soft-deleted student ────────────────
export async function PATCH(req, context) {
  try {
    const { id } = await context.params;

    const ctError = validateJsonContentType(req);
    if (ctError) return ctError;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    if (!validateObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID format" },
        { status: 400 }
      );
    }

    await connectDB();

    const restored = await Student.findOneAndUpdate(
      { _id: id, isDeleted: true },
      {
        $set: {
          isDeleted:                 false,
          deletedAt:                 null,
          "enrollmentInfo.status":   "Active",
          "metadata.lastModifiedBy": authCheck.user.id,
          "metadata.updatedAt":      new Date(),
        },
      },
      { new: true }
    );

    if (!restored) {
      return NextResponse.json(
        { success: false, message: "Student not found in trash or already active" },
        { status: 404 }
      );
    }

    console.log(`✅ Student restored: ${restored.enrollmentNumber}`);

    return NextResponse.json({
      success: true,
      message: "Student restored successfully",
      data: {
        id:               restored._id,
        enrollmentNumber: restored.enrollmentNumber,
        fullName:         restored.personalInfo?.fullName,
        status:           restored.enrollmentInfo?.status,
        restoredAt:       new Date(),
      },
    }, { status: 200 });

  } catch (error) {
    console.error("❌ PATCH /api/allStudents/[id]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to restore student", error: error.message },
      { status: 500 }
    );
  }
}