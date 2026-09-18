// app/api/payroll/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PayrollEntry from "../../models/PayrollEntry";
import "../../models/User";
import "../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const instructorId = searchParams.get("instructorId");
    const groupId = searchParams.get("groupId");
    const status = searchParams.get("status");
    const deliveryMode = searchParams.get("deliveryMode");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query = { isDeleted: false };

    if (instructorId && mongoose.Types.ObjectId.isValid(instructorId)) {
      query.instructorId = new mongoose.Types.ObjectId(instructorId);
    }
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      query.groupId = new mongoose.Types.ObjectId(groupId);
    }
    if (status) query.status = status;
    if (deliveryMode) query.deliveryMode = deliveryMode;

    if (from || to) {
      query.sessionDate = {};
      if (from) query.sessionDate.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.sessionDate.$lte = end;
      }
    }

    const total = await PayrollEntry.countDocuments(query);

    const entries = await PayrollEntry.find(query)
      .populate("instructorId", "name email image")
      .populate("groupId", "name code")
      .sort({ sessionDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // ✅ إجماليات على الفلتر كله (مش الصفحة بس)
    const [totals] = await PayrollEntry.aggregate([
      { $match: { ...query, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalMinutes: { $sum: "$durationMinutes" },
          totalSessionAmount: { $sum: "$sessionAmount" },
          totalTransportation: { $sum: "$transportationAllowance" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    // ✅ تجميع لكل مدرس — ده اللي بيتعرض في كشف المرتبات
    const byInstructor = await PayrollEntry.aggregate([
      { $match: { ...query, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$instructorId",
          sessionsCount: { $sum: 1 },
          totalMinutes: { $sum: "$durationMinutes" },
          totalSessionAmount: { $sum: "$sessionAmount" },
          totalTransportation: { $sum: "$transportationAllowance" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "instructor",
        },
      },
      { $unwind: { path: "$instructor", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          instructorId: "$_id",
          name: "$instructor.name",
          email: "$instructor.email",
          image: "$instructor.image",
          sessionsCount: 1,
          totalMinutes: 1,
          totalSessionAmount: 1,
          totalTransportation: 1,
          totalAmount: 1,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    return NextResponse.json({
      success: true,
      data: entries,
      byInstructor,
      totals: totals || {
        totalMinutes: 0,
        totalSessionAmount: 0,
        totalTransportation: 0,
        totalAmount: 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ GET /api/payroll:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}