// /src/app/api/students/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    console.log("📋 Fetching student data...");
    
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log("❌ Admin authorization failed");
      return authCheck.response;
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    console.log("📋 Student ID:", id);

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
    }).lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    console.log("✅ Student data fetched successfully");
    
    return NextResponse.json({ 
      success: true, 
      data: student 
    });

  } catch (error) {
    console.error("❌ Error fetching student:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}