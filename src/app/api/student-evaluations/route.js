import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import StudentEvaluation from "../../models/StudentEvaluation";
import "../../models/Student";
import "../../models/Group";
import "../../models/Session";
import "../../models/User";
import { requireAdmin } from "@/utils/authMiddleware";

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const query = { isDeleted: { $ne: true } };

    const groupId = searchParams.get("groupId");
    const studentId = searchParams.get("studentId");
    const decision = searchParams.get("decision");
    const category = searchParams.get("category");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) query.groupId = groupId;
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) query.studentId = studentId;
    if (decision) query.finalDecision = decision;
    if (category) query["marketing.studentCategory"] = category;

    if (from || to) {
      query["metadata.evaluatedAt"] = {};
      if (from) query["metadata.evaluatedAt"].$gte = new Date(from);
      if (to) query["metadata.evaluatedAt"].$lte = new Date(to);
    }

    const evaluations = await StudentEvaluation.find(query)
      .populate("studentId", "personalInfo.fullName enrollmentNumber studentType")
      .populate("groupId", "name code") // ← عدّل أسماء الحقول حسب موديل Group
      .populate("sessionId", "title scheduledDate startTime sessionNumber moduleIndex") // ← حسب موديل Session
      .populate("instructorId", "name email") // ← حسب موديل User
      .select("-marketing.messagesSent -marketing.offersMade -marketing.followupActions")
      .sort({ "metadata.evaluatedAt": -1 })
      .limit(2000)
      .lean();

    return NextResponse.json({ success: true, data: evaluations });
  } catch (error) {
    console.error("❌ GET /api/student-evaluations:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}