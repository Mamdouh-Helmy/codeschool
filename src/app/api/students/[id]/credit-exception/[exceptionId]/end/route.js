//api/students/[id]/credit-exception/[exceptionId]/end/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const resolvedParams = await params;
    const { id, exceptionId } = resolvedParams;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID" },
        { status: 400 }
      );
    }

    if (!exceptionId || !mongoose.Types.ObjectId.isValid(exceptionId)) {
      return NextResponse.json(
        { success: false, message: "Invalid exception ID" },
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

    const result = await student.endCreditException(exceptionId);

    if (result.success) {
      // ✅ إحضار البيانات المحدثة
      const updatedStudent = await Student.findById(id).lean();
      
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
    console.error("Error ending credit exception:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}