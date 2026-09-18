// app/api/groups/release-links/route.js
// POST → إلغاء حجز جروبات متعارضة عن لينكات محددة
// Body: { releases: [{ linkId, groupId }] }  ← الأدق والأأمن
// أو (توافقًا مع القديم): { linkIds: [...] } + { forGroupId } لو عاوز تفك
// كل الجروبات المتعارضة مع forGroupId على اللينكات دي تحديدًا.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../models/MeetingLink";
import Group from "../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";
import { findScheduleConflict } from "@/utils/checkMeetingLinks";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { releases, linkIds, forGroupId } = body;

    const results = [];

    // ✅ الوضع الدقيق: قائمة { linkId, groupId } صريحة
    if (Array.isArray(releases) && releases.length > 0) {
      for (const { linkId, groupId } of releases) {
        if (!mongoose.Types.ObjectId.isValid(linkId) || !mongoose.Types.ObjectId.isValid(groupId)) {
          results.push({ linkId, groupId, success: false, error: "Invalid ID" });
          continue;
        }
        try {
          const link = await MeetingLink.findOne({ _id: linkId, isDeleted: false });
          if (!link) throw new Error("Link not found");
          await link.releaseReservation(groupId);
          results.push({ linkId, groupId, name: link.name, success: true });
        } catch (e) {
          results.push({ linkId, groupId, success: false, error: e.message });
        }
      }
    }
    // ✅ التوافق مع الفرونت القديم: linkIds + forGroupId — بيفك بس حجز
    // الجروب/الجروبات اللي فعليًا متعارضة مع forGroupId على اللينكات دي
    else if (Array.isArray(linkIds) && linkIds.length > 0 && forGroupId) {
      const group = await Group.findById(forGroupId).select("schedule");
      if (!group) {
        return NextResponse.json({ success: false, error: "forGroupId not found" }, { status: 404 });
      }
      const validIds = linkIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      const links = await MeetingLink.find({ _id: { $in: validIds }, isDeleted: false });

      for (const link of links) {
        const conflict = findScheduleConflict(link, group.schedule, forGroupId);
        if (conflict?.conflictingGroupId) {
          try {
            await link.releaseReservation(conflict.conflictingGroupId);
            results.push({ linkId: link._id, groupId: conflict.conflictingGroupId, name: link.name, success: true });
          } catch (e) {
            results.push({ linkId: link._id, success: false, error: e.message });
          }
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Provide either { releases: [{linkId, groupId}] } or { linkIds, forGroupId }" },
        { status: 400 },
      );
    }

    const releasedCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      released: releasedCount,
      failed: results.filter((r) => !r.success).length,
      results,
      message: `Released ${releasedCount} reservation(s) successfully`,
    });
  } catch (error) {
    console.error("❌ Error releasing links:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}