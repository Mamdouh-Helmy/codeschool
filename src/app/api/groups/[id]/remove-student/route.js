import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Student from "../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import { stopBillingForRemovedStudent } from "@/lib/billing";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 },
      );
    }

    // removePackage: true  → شيل الباقة + وقف الفوترة والرسايل
    // removePackage: false → سيب الباقة والفوترة زي ما هي (الرسايل تكمّل عادي)
    const { studentId, removePackage = false } = await req.json();

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid student ID" },
        { status: 400 },
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    if (!group.students.includes(studentId)) {
      return NextResponse.json(
        { success: false, error: "Student is not in this group" },
        { status: 400 },
      );
    }

    // نجيب الباقة الحالية قبل أي تعديل (محتاجينها لربط الفواتير)
    const student = await Student.findById(studentId).select(
      "creditSystem.currentPackage academicInfo.groupIds",
    );
    const currentPackage = student?.creditSystem?.currentPackage || null;

    await Group.findByIdAndUpdate(id, {
      $pull: { students: studentId },
      $inc: { currentStudentsCount: -1 },
      $set: { updatedAt: new Date() },
    });

    await Student.findByIdAndUpdate(studentId, {
      $pull: { "academicInfo.groupIds": id },
      $set: { "metadata.updatedAt": new Date() },
    });

    let billing = null;
    let packageRemoved = false;

    if (removePackage) {
      // 1) وقف الفوترة (فواتير + تنبيهات) — حتى لو مفيش باقة حالية
      billing = await stopBillingForRemovedStudent({
        studentId,
        groupId: id,
        packageId: currentPackage?._id || null,
        actedBy: authCheck.user?.id,
      });

      // 2) نقل الباقة للهيستوري وتصفير الرصيد
      if (currentPackage) {
        await Student.updateOne(
          { _id: studentId },
          {
            $push: {
              "creditSystem.packagesHistory": {
                ...currentPackage.toObject(),
                isActive: false,
                status: "expired",
              },
            },
            $unset: { "creditSystem.currentPackage": "" },
            $set: {
              "creditSystem.status": "no_package",
              "creditSystem.stats.totalHoursRemaining": 0,
              "metadata.updatedAt": new Date(),
            },
          },
        );
        packageRemoved = true;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Student removed successfully",
      packageRemoved,
      billing,
      otherGroupsCount: Math.max(
        0,
        (student?.academicInfo?.groupIds || []).filter(
          (g) => String(g) !== String(id),
        ).length,
      ),
    });
  } catch (error) {
    console.error("❌ Error removing student:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove student" },
      { status: 500 },
    );
  }
}