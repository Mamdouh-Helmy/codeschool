// /src/app/api/cron/fix-delivery-mode/route.js  (احذفه بعد التشغيل)
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../models/Group";
import Session from "../../../models/Session";

const CRON_SECRET = process.env.CRON_SECRET || "your-secret-key-change-this";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const authHeader = req.headers.get("authorization");

  if (secret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  await connectDB();

  const groups = await Group.find({ isDeleted: false })
    .select("_id name deliveryMode")
    .lean();

  let total = 0;
  const details = [];

  for (const g of groups) {
    const mode = g.deliveryMode === "offline" ? "offline" : "online";

    const r = await Session.updateMany(
      {
        groupId: g._id,
        isDeleted: false,
        status: { $ne: "completed" },
        $or: [
          { deliveryMode: { $ne: mode } },
          { deliveryMode: null },
          { deliveryMode: { $exists: false } },
        ],
      },
      { $set: { deliveryMode: mode } },
    );

    if (r.modifiedCount) {
      total += r.modifiedCount;
      details.push({ group: g.name, mode, fixed: r.modifiedCount });
    }
  }

  return NextResponse.json({ success: true, totalFixed: total, details });
}