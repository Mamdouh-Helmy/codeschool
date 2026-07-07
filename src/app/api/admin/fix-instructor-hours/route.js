// // app/api/admin/fix-instructor-hours/route.js
// // ⚠️ TEMPORARY SCRIPT — NO AUTH — امسح الملف ده بعد الاستخدام مباشرة
// //
// // GET  -> تقرير فحص فقط (dry-run)، مفيهوش أي تعديل على الداتابيز
// // POST -> يطبق التصحيح فعليًا (body: { groupId?, instructorId? } اختياري للتحديد)

// import { NextResponse } from "next/server";
// import { connectDB } from "@/lib/mongodb";
// import Group from "../../../models/Group";
// import Session from "../../../models/Session";
// import User from "../../../models/User";

// const SESSION_HOURS = 2;

// async function buildMismatchReport({ groupId = null, instructorId = null } = {}) {
//   const groupQuery = { isDeleted: false };
//   if (groupId) groupQuery._id = groupId;

//   const groups = await Group.find(groupQuery)
//     .select("name code instructors status")
//     .lean();

//   if (groups.length === 0) {
//     return { groups: [], mismatches: [], perInstructorTotals: {} };
//   }

//   const allInstructorIds = [
//     ...new Set(
//       groups.flatMap((g) =>
//         (g.instructors || []).map((i) => i.userId?.toString()).filter(Boolean)
//       )
//     ),
//   ];

//   const users = await User.find({ _id: { $in: allInstructorIds } })
//     .select("name email")
//     .lean();
//   const userMap = {};
//   users.forEach((u) => (userMap[u._id.toString()] = u));

//   const mismatches = [];
//   const perInstructorTotals = {};

//   for (const group of groups) {
//     if (!group.instructors || group.instructors.length === 0) continue;

//     const completedCount = await Session.countDocuments({
//       groupId: group._id,
//       status: "completed",
//       isDeleted: false,
//     });

//     const correctHours = completedCount * SESSION_HOURS;

//     for (const inst of group.instructors) {
//       if (!inst.userId) continue;
//       const instId = inst.userId.toString();

//       if (instructorId && instId !== instructorId) continue;

//       const storedHours = inst.countTime || 0;
//       const diff = storedHours - correctHours;

//       if (!perInstructorTotals[instId]) {
//         perInstructorTotals[instId] = {
//           instructorId: instId,
//           name: userMap[instId]?.name || "غير معروف",
//           email: userMap[instId]?.email || "",
//           totalStored: 0,
//           totalCorrect: 0,
//         };
//       }
//       perInstructorTotals[instId].totalStored += storedHours;
//       perInstructorTotals[instId].totalCorrect += correctHours;

//       if (diff !== 0) {
//         mismatches.push({
//           groupId: group._id.toString(),
//           groupName: group.name,
//           groupCode: group.code,
//           instructorId: instId,
//           instructorName: userMap[instId]?.name || "غير معروف",
//           instructorEmail: userMap[instId]?.email || "",
//           completedSessions: completedCount,
//           storedHours,
//           correctHours,
//           diff,
//         });
//       }
//     }
//   }

//   return {
//     groups,
//     mismatches: mismatches.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
//     perInstructorTotals: Object.values(perInstructorTotals).filter(
//       (p) => p.totalStored !== p.totalCorrect
//     ),
//   };
// }

// export async function GET(req) {
//   try {
//     await connectDB();

//     const { searchParams } = new URL(req.url);
//     const groupId = searchParams.get("groupId") || null;
//     const instructorId = searchParams.get("instructorId") || null;

//     const { mismatches, perInstructorTotals } = await buildMismatchReport({
//       groupId,
//       instructorId,
//     });

//     return NextResponse.json(
//       {
//         success: true,
//         mode: "dry-run",
//         totalMismatches: mismatches.length,
//         mismatches,
//         perInstructorTotals,
//         message:
//           mismatches.length === 0
//             ? "كل الساعات مظبوطة، مفيش أي فروقات"
//             : `تم اكتشاف ${mismatches.length} فرق. استخدم POST لتطبيق التصحيح`,
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("❌ Fix Instructor Hours (GET) Error:", error);
//     return NextResponse.json(
//       { success: false, message: "فشل في فحص الساعات", error: error.message },
//       { status: 500 }
//     );
//   }
// }

// export async function POST(req) {
//   try {
//     await connectDB();

//     let body = {};
//     try {
//       body = await req.json();
//     } catch {
//       body = {};
//     }
//     const { groupId = null, instructorId = null } = body;

//     const { mismatches } = await buildMismatchReport({ groupId, instructorId });

//     if (mismatches.length === 0) {
//       return NextResponse.json(
//         {
//           success: true,
//           message: "كل الساعات مظبوطة بالفعل، مفيش حاجة نصلحها",
//           fixedGroups: 0,
//           fixedInstructors: 0,
//         },
//         { status: 200 }
//       );
//     }

//     const groupIdsToFix = [...new Set(mismatches.map((m) => m.groupId))];

//     let fixedGroups = 0;
//     let fixedInstructors = 0;
//     const appliedFixes = [];

//     for (const gId of groupIdsToFix) {
//       const groupMismatches = mismatches.filter((m) => m.groupId === gId);

//       const groupDoc = await Group.findById(gId);
//       if (!groupDoc) continue;

//       for (const m of groupMismatches) {
//         const instructor = groupDoc.instructors.find(
//           (i) => i.userId.toString() === m.instructorId
//         );
//         if (instructor) {
//           const before = instructor.countTime || 0;
//           instructor.countTime = m.correctHours;
//           fixedInstructors++;
//           appliedFixes.push({
//             groupId: gId,
//             groupName: groupDoc.name,
//             instructorId: m.instructorId,
//             instructorName: m.instructorName,
//             before,
//             after: m.correctHours,
//           });
//         }
//       }

//       await groupDoc.save();
//       fixedGroups++;
//     }

//     return NextResponse.json(
//       {
//         success: true,
//         mode: "applied",
//         message: `تم تصحيح ${fixedInstructors} سجل مدرس في ${fixedGroups} جروب`,
//         fixedGroups,
//         fixedInstructors,
//         appliedFixes,
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("❌ Fix Instructor Hours (POST) Error:", error);
//     return NextResponse.json(
//       { success: false, message: "فشل في تطبيق التصحيح", error: error.message },
//       { status: 500 }
//     );
//   }
// }