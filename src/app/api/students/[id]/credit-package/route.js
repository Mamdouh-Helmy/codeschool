import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    console.log("📦 Starting credit package addition...");
    
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log("❌ Admin authorization failed");
      return authCheck.response;
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID" },
        { status: 400 }
      );
    }

    const packageData = await req.json();

    await connectDB();

    const student = await Student.findOne({ 
      _id: id,
      isDeleted: false 
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    const result = await student.addCreditPackage(packageData);

    if (result.success) {
      // ✅ إحضار البيانات المحدثة بالكامل
      const updatedStudent = await Student.findById(id)
        .lean();

      // تنسيق البيانات للإرسال
      const formattedStudent = {
        _id: updatedStudent._id,
        id: updatedStudent._id,
        enrollmentNumber: updatedStudent.enrollmentNumber,
        personalInfo: updatedStudent.personalInfo,
        guardianInfo: updatedStudent.guardianInfo,
        creditSystem: updatedStudent.creditSystem || {
          currentPackage: null,
          packagesHistory: [],
          exceptions: [],
          usageHistory: [],
          stats: {
            totalHoursPurchased: 0,
            totalHoursUsed: 0,
            totalHoursRemaining: 0,
            totalSessionsAttended: 0,
            totalExceptions: 0,
            activeExceptions: 0
          },
          status: "no_package"
        }
      };
      
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        student: formattedStudent,
        message: "Package added successfully" 
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("❌ Error adding credit package:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE route لحذف الحزمة - بدون إضافة للتاريخ
export async function DELETE(req, { params }) {
  try {
    console.log("🗑️ Deleting credit package...");
    
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const student = await Student.findOne({ 
      _id: id,
      isDeleted: false 
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // ✅ حذف الحزمة الحالية
    if (student.creditSystem?.currentPackage) {
      
      // ✅ حفظ الحزمة في التاريخ أولاً (بدون تغيير الـ status)
      if (!student.creditSystem.packagesHistory) {
        student.creditSystem.packagesHistory = [];
      }
      
      // إضافة نسخة من الحزمة الحالية إلى التاريخ بدون تغيير status
      student.creditSystem.packagesHistory.push({
        ...student.creditSystem.currentPackage.toObject(),
        deletedAt: new Date() // فقط نضيف حقل deletedAt إضافي
      });

      // ✅ إزالة الحزمة الحالية
      student.creditSystem.currentPackage = null;
      student.creditSystem.status = "no_package";
      
      // تحديث الإحصائيات
      if (student.creditSystem.stats) {
        student.creditSystem.stats.totalHoursRemaining = 0;
      }

      await student.save();

      // إحضار البيانات المحدثة
      const updatedStudent = await Student.findById(id).lean();

      return NextResponse.json({ 
        success: true, 
        message: "Package deleted successfully",
        student: {
          _id: updatedStudent._id,
          creditSystem: updatedStudent.creditSystem
        }
      });
    }

    return NextResponse.json(
      { success: false, message: "No active package found" },
      { status: 404 }
    );

  } catch (error) {
    console.error("❌ Error deleting credit package:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}