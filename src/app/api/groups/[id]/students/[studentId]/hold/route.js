import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";

export async function POST(req, { params }) {
  const authCheck = await requireAdmin(req);
  if (!authCheck.authorized) return authCheck.response;
  await connectDB();
  const { id, studentId } = await params;
  if (![id, studentId].every((v) => mongoose.Types.ObjectId.isValid(v)))
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });

  const { reason = "" } = await req.json().catch(() => ({}));

  const r = await Student.updateOne(
    {
      _id: studentId,
      isDeleted: false,
      "academicInfo.groupIds": id,
      "academicInfo.pausedGroups.groupId": { $ne: id },
    },
    { $push: { "academicInfo.pausedGroups": { groupId: id, reason, pausedAt: new Date(), pausedBy: authCheck.user.id } } },
  );
  if (!r.modifiedCount)
    return NextResponse.json({ success: false, error: "الطالب مش في الجروب أو موقوف بالفعل" }, { status: 400 });
  return NextResponse.json({ success: true, message: "تم إيقاف الطالب في الجروب" });
}

export async function DELETE(req, { params }) {
  const authCheck = await requireAdmin(req);
  if (!authCheck.authorized) return authCheck.response;
  await connectDB();
  const { id, studentId } = await params;
  const r = await Student.updateOne(
    { _id: studentId },
    { $pull: { "academicInfo.pausedGroups": { groupId: id } } },
  );
  if (!r.modifiedCount)
    return NextResponse.json({ success: false, error: "الطالب مش موقوف" }, { status: 400 });
  return NextResponse.json({ success: true, message: "تم تشغيل الطالب تاني" });
}