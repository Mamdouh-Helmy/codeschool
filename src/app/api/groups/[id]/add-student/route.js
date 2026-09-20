// /app/api/groups/[id]/add-student/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Student from "../../../../models/Student";
import Course from "../../../../models/Course";
import { onStudentAddedToGroup } from "../../../../services/groupAutomation";
import { requireAdmin } from "@/utils/authMiddleware";

// ✅ Helper: build maps link from group (offline)
function buildMapsLink(group) {
  const loc = group?.locationDetails || {};
  if (loc.lat != null && loc.lng != null) {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  }
  if (loc.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
  }
  if (loc.placeName || group?.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.placeName || group.location)}`;
  }
  return "";
}

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id } = await params;
    const groupId = id;

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const {
      studentId,
      sendWhatsApp = true,
      studentMessage = null,
      guardianMessage = null,
      moduleOverviewMessage = null,
    } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
        { status: 400 },
      );
    }

    // ✅ populate courseId مع curriculum كاملاً
    const group = await Group.findById(groupId)
      .populate({
        path: "courseId",
        select: "title level curriculum description",
      })
      .populate("students", "_id");

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 },
      );
    }

    const studentObjectIds = (group.students || []).map((s) => {
      const sid = s._id || s.id || s;
      return typeof sid === "object" ? sid.toString() : String(sid);
    });

    if (studentObjectIds.includes(studentId.toString())) {
      return NextResponse.json(
        { success: false, error: "Student is already in this group" },
        { status: 400 },
      );
    }

    const currentCount = group.students?.length || 0;
    const maxStudents = group.maxStudents || 0;

    if (currentCount >= maxStudents) {
      return NextResponse.json(
        { success: false, error: "Group is full", currentCount, maxStudents },
        { status: 400 },
      );
    }

    // ✅ استخرج module data من الكورس
    let moduleTitle = "";
    let moduleDescription = "";

    const course = group.courseId;

    if (course?.curriculum?.length > 0) {
      const firstModule = course.curriculum[0];
      moduleTitle = firstModule?.title || "";
      moduleDescription = firstModule?.description || "";
      console.log(`✅ Module data from courseId.curriculum[0]:`);
      console.log(`   Title: ${moduleTitle}`);
      console.log(`   Description: ${moduleDescription?.substring(0, 80)}`);
    } else if (group.courseSnapshot?.curriculum?.length > 0) {
      const firstModule = group.courseSnapshot.curriculum[0];
      moduleTitle = firstModule?.title || "";
      moduleDescription = firstModule?.description || "";
      console.log(`✅ Module data from courseSnapshot.curriculum[0] (fallback):`);
      console.log(`   Title: ${moduleTitle}`);
    } else {
      const courseId = group.courseId?._id || group.courseId;
      if (courseId) {
        try {
          const courseDoc = await Course.findById(courseId)
            .select("curriculum")
            .lean();
          if (courseDoc?.curriculum?.length > 0) {
            const firstModule = courseDoc.curriculum[0];
            moduleTitle = firstModule?.title || "";
            moduleDescription = firstModule?.description || "";
            console.log(`✅ Module data from direct Course query (last fallback):`);
            console.log(`   Title: ${moduleTitle}`);
          }
        } catch (courseErr) {
          console.warn(`⚠️ Could not fetch course for module data:`, courseErr.message);
        }
      }
    }

    // ✅ NEW: detect offline + build location data
    const isOffline = group.deliveryMode === "offline";
    const loc = group.locationDetails || {};
    const placeName = loc.placeName || group.location || "";
    const address = loc.address || loc.extraDetails || "";
    const mapsLink = isOffline ? buildMapsLink(group) : "";

    console.log(`\n✅ VALIDATION PASSED ==========`);
    console.log(`Group: ${group.name} (${group.code})`);
    console.log(`Student: ${student.personalInfo?.fullName}`);
    console.log(`Delivery Mode: ${group.deliveryMode} (isOffline: ${isOffline})`);
    console.log(`moduleTitle: "${moduleTitle}"`);
    console.log(`moduleDescription: "${moduleDescription?.substring(0, 80)}"`);
    if (isOffline) {
      console.log(`📍 placeName: "${placeName}"`);
      console.log(`📌 address: "${address}"`);
      console.log(`🗺️ mapsLink: "${mapsLink}"`);
    }

    // ✅ أضف الطالب للـ group
    await Group.findByIdAndUpdate(
      groupId,
      {
        $addToSet: { students: studentId },
        $set: {
          currentStudentsCount: currentCount + 1,
          "metadata.updatedAt": new Date(),
        },
      },
      { new: true },
    );

    let automationResult = null;

    try {
      automationResult = await onStudentAddedToGroup(
        studentId,
        groupId,
        {
          student: studentMessage,
          guardian: guardianMessage,
          moduleOverview: moduleOverviewMessage,
        },
        sendWhatsApp,
        // ✅ مرّر module + location data للـ automation
        {
          moduleTitle,
          moduleDescription,
          // ✅ Offline data
          isOffline,
          placeName,
          address,
          mapsLink,
        },
      );

      console.log(`\n✅ AUTOMATION COMPLETED ==========`);
      console.log("Messages Sent:", automationResult.messagesSent);
    } catch (automationError) {
      console.error(`\n❌ AUTOMATION ERROR ==========`);
      console.error(automationError);
      automationResult = {
        success: false,
        error: automationError.message,
        messagesSent: {
          student: false,
          guardian: false,
          moduleOverview: false,
        },
      };
    }

    return NextResponse.json({
      success: true,
      message: "Student added successfully",
      data: {
        group: {
          id: group._id,
          name: group.name,
          code: group.code,
          currentStudentsCount: currentCount + 1,
          maxStudents: group.maxStudents,
          deliveryMode: group.deliveryMode,
          isOffline,
        },
        student: {
          id: student._id,
          name: student.personalInfo?.fullName,
          email: student.personalInfo?.email,
          whatsappNumber: student.personalInfo?.whatsappNumber,
          guardianWhatsappNumber: student.guardianInfo?.whatsappNumber,
          preferredLanguage:
            student.communicationPreferences?.preferredLanguage || "ar",
          gender: student.personalInfo?.gender,
          guardianRelationship: student.guardianInfo?.relationship,
        },
        moduleData: {
          title: moduleTitle,
          description: moduleDescription,
        },
        // ✅ NEW: location data في الـ response
        ...(isOffline && {
          locationData: {
            placeName,
            address,
            mapsLink,
          },
        }),
      },
      automation: automationResult,
    });
  } catch (error) {
    console.error(`\n❌ ERROR IN ADD STUDENT ==========`);
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to add student to group",
        details:
          process.env.NODE_ENV === "development" ? error.toString() : undefined,
      },
      { status: 500 },
    );
  }
}