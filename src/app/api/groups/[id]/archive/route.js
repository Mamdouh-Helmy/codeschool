import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";

async function load(req, params) {
  const authCheck = await requireAdmin(req);
  if (!authCheck.authorized) return { err: authCheck.response };
  await connectDB();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return { err: NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 }) };
  const group = await Group.findOne({ _id: id, isDeleted: false });
  if (!group)
    return { err: NextResponse.json({ success: false, error: "Group not found" }, { status: 404 }) };
  return { group, user: authCheck.user };
}

export async function POST(req, { params }) {
  const { err, group, user } = await load(req, params);
  if (err) return err;
  if (group.isArchived)
    return NextResponse.json({ success: false, error: "الجروب مؤرشف بالفعل" }, { status: 400 });
  const { reason = "" } = await req.json().catch(() => ({}));
  group.isArchived = true;
  group.archive = { archivedAt: new Date(), archivedBy: user.id, reason, restoredAt: null };
  await group.save();
  return NextResponse.json({ success: true, message: "تم أرشفة الجروب" });
}

export async function DELETE(req, { params }) {
  const { err, group } = await load(req, params);
  if (err) return err;
  if (!group.isArchived)
    return NextResponse.json({ success: false, error: "الجروب مش مؤرشف" }, { status: 400 });
  group.isArchived = false;
  group.archive.restoredAt = new Date();
  await group.save();
  return NextResponse.json({ success: true, message: "تم استرجاع الجروب" });
}