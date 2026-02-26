import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    const exceptionData = await req.json();
    exceptionData.createdBy = authCheck.user.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // ✅ سجل البيانات قبل الإضافة للتأكد
    const beforeHours = student.creditSystem?.currentPackage?.remainingHours || 0;
    console.log(`📊 Before addition - Remaining hours: ${beforeHours}`);
    console.log(`📊 Exception data:`, exceptionData);

    const result = await student.addCreditException(exceptionData);

    if (result.success) {
      // ✅ إحضار البيانات المحدثة
      const updatedStudent = await Student.findById(id).lean();
      
      // ✅ سجل النتيجة للتأكد
      const afterHours = updatedStudent.creditSystem?.currentPackage?.remainingHours || 0;
      console.log(`📊 After addition - Remaining hours: ${afterHours}`);
      console.log(`📊 Difference: ${afterHours - beforeHours} hours`);
      
      return NextResponse.json({ 
        success: true, 
        data: result.data,
        student: updatedStudent 
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error adding credit exception:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}