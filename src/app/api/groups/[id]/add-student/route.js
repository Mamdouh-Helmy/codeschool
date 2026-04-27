// /app/api/groups/[id]/add-student/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Student from "../../../../models/Student";
import { onStudentAddedToGroup } from "../../../../services/groupAutomation";
import { requireAdmin } from "@/utils/authMiddleware";

/**
 * ✅ POST: إضافة طالب إلى مجموعة مع 3 رسائل منفصلة
 */
export async function POST(req, { params }) {
  try {
    console.log("🔐 Checking authentication...");
    const authCheck = await requireAdmin(req);

    if (!authCheck.authorized) {
      console.log("❌ Authentication failed");
      return authCheck.response;
    }

    console.log("✅ Authentication successful - User:", authCheck.user?.email || authCheck.user?.userId);

    await connectDB();

    const { id } = await params;
    const groupId = id;

    console.log("📌 Group ID from params:", groupId);

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    console.log("\n📥 ADD STUDENT REQUEST ==========");
    console.log("Group ID:", groupId);
    console.log("Body keys:", Object.keys(body));

    const {
      studentId,
      sendWhatsApp        = true,
      studentMessage      = null,
      guardianMessage     = null,
      moduleOverviewMessage = null,   // ✅ الرسالة الثالثة
    } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Fetch group
    const group = await Group.findById(groupId)
      .populate("courseId")
      .populate("students", "_id");

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // Fetch student
    const student = await Student.findById(studentId);

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    // Check if student already in group
    const studentObjectIds = (group.students || []).map(s => {
      const sid = s._id || s.id || s;
      return typeof sid === "object" ? sid.toString() : String(sid);
    });

    if (studentObjectIds.includes(studentId.toString())) {
      return NextResponse.json(
        { success: false, error: "Student is already in this group" },
        { status: 400 }
      );
    }

    // Check group capacity
    const currentCount = group.students?.length || 0;
    const maxStudents  = group.maxStudents || 0;

    if (currentCount >= maxStudents) {
      return NextResponse.json(
        { success: false, error: "Group is full", currentCount, maxStudents },
        { status: 400 }
      );
    }

    console.log("\n✅ VALIDATION PASSED ==========");
    console.log(`Group: ${group.name} (${group.code})`);
    console.log(`Student: ${student.personalInfo?.fullName}`);
    console.log(`Preferred Language: ${student.communicationPreferences?.preferredLanguage || "ar"}`);
    console.log(`Current: ${currentCount}/${maxStudents}`);
    console.log(`moduleOverviewMessage: ${moduleOverviewMessage ? "✅ provided" : "⚠️ empty"}`);

    // Add student to group in database
    await Group.findByIdAndUpdate(
      groupId,
      {
        $addToSet: { students: studentId },
        $set: {
          currentStudentsCount: currentCount + 1,
          "metadata.updatedAt": new Date(),
        },
      },
      { new: true }
    );

    console.log("\n✅ STUDENT ADDED TO GROUP DATABASE ==========");

    // Trigger automation with THREE separate messages ✅
    let automationResult = null;

    try {
      automationResult = await onStudentAddedToGroup(
        studentId,
        groupId,
        {
          student:       studentMessage,
          guardian:      guardianMessage,
          moduleOverview: moduleOverviewMessage,  // ✅
        },
        sendWhatsApp
      );

      console.log("\n✅ AUTOMATION COMPLETED ==========");
      console.log("Messages Sent:", automationResult.messagesSent);
    } catch (automationError) {
      console.error("\n❌ AUTOMATION ERROR ==========");
      console.error(automationError);
      automationResult = {
        success: false,
        error: automationError.message,
        messagesSent: { student: false, guardian: false, moduleOverview: false },
      };
    }

    return NextResponse.json({
      success: true,
      message: "Student added successfully",
      data: {
        group: {
          id:                   group._id,
          name:                 group.name,
          code:                 group.code,
          currentStudentsCount: currentCount + 1,
          maxStudents:          group.maxStudents,
        },
        student: {
          id:                      student._id,
          name:                    student.personalInfo?.fullName,
          email:                   student.personalInfo?.email,
          whatsappNumber:          student.personalInfo?.whatsappNumber,
          guardianWhatsappNumber:  student.guardianInfo?.whatsappNumber,
          preferredLanguage:       student.communicationPreferences?.preferredLanguage || "ar",
          gender:                  student.personalInfo?.gender,
          guardianRelationship:    student.guardianInfo?.relationship,
        },
      },
      automation: automationResult,
    });

  } catch (error) {
    console.error("\n❌ ERROR IN ADD STUDENT ==========");
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        error:   error.message || "Failed to add student to group",
        details: process.env.NODE_ENV === "development" ? error.toString() : undefined,
      },
      { status: 500 }
    );
  }
}