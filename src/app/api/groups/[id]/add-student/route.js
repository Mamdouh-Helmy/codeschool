// app/api/groups/[id]/add-student/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Group from '../../../../models/Group';
import Student from '../../../../models/Student';
import { requireAdmin } from '@/utils/authMiddleware';
import { onStudentAddedToGroup } from '@/app/services/groupAutomation';
import mongoose from 'mongoose';

export async function POST(req, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    console.log(`\n👥 [ADD-STUDENT] ========== NEW REQUEST ==========`);
    console.log(`📍 Group ID: ${id}`);
    
    // Admin check
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log("❌ [ADD-STUDENT] Unauthorized");
      return authCheck.response;
    }
    const adminUser = authCheck.user;

    await connectDB();

    // Parse request body مع الرسالة المخصصة
    const body = await req.json();
    const { studentId, customMessage, sendWhatsApp = true } = body;

    console.log(`📦 Request Body:`, body);
    console.log(`🆔 Student ID from body: ${studentId}`);
    console.log(`📝 Custom Message provided: ${customMessage ? 'Yes' : 'No'}`);
    console.log(`📱 Send WhatsApp: ${sendWhatsApp}`);

    // Validate IDs
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.log(`❌ Invalid Group ID`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Group ID format',
          received: { id, type: typeof id }
        },
        { status: 400 }
      );
    }

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      console.log(`❌ Invalid Student ID`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid Student ID format',
          received: { studentId, type: typeof studentId }
        },
        { status: 400 }
      );
    }

    console.log(`✅ Both IDs are valid ObjectIds`);

    // Fetch group and student
    console.log(`🔍 Fetching group and student...`);
    
    const [group, student] = await Promise.all([
      Group.findOne({ _id: id, isDeleted: false })
        .populate('courseId', 'title level')
        .lean(),
      Student.findOne({ _id: studentId, isDeleted: false })
        .select('personalInfo.fullName personalInfo.whatsappNumber enrollmentNumber communicationPreferences.preferredLanguage guardianInfo')
        .lean()
    ]);

    // Validate group exists
    if (!group) {
      console.log(`❌ Group not found`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Group not found or has been deleted'
        },
        { status: 404 }
      );
    }

    console.log(`✅ Group found:`, {
      id: group._id.toString(),
      name: group.name,
      code: group.code,
      status: group.status,
      currentStudents: group.currentStudentsCount,
      maxStudents: group.maxStudents,
      studentsArray: group.students?.length || 0,
      automation: {
        whatsappEnabled: group.automation?.whatsappEnabled,
        welcomeMessage: group.automation?.welcomeMessage
      }
    });

    // Validate student exists
    if (!student) {
      console.log(`❌ Student not found`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Student not found or has been deleted'
        },
        { status: 404 }
      );
    }

    console.log(`✅ Student found:`, {
      id: student._id.toString(),
      name: student.personalInfo?.fullName,
      enrollment: student.enrollmentNumber,
      whatsappNumber: student.personalInfo?.whatsappNumber,
      guardianName: student.guardianInfo?.name,
      guardianWhatsapp: student.guardianInfo?.whatsappNumber,
      preferredLanguage: student.communicationPreferences?.preferredLanguage
    });

    // Check group status
    if (group.status !== 'active') {
      console.log(`❌ Group not active: ${group.status}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Can only add students to active groups',
          currentStatus: group.status
        },
        { status: 400 }
      );
    }

    // Check if group is full
    if (group.currentStudentsCount >= group.maxStudents) {
      console.log(`❌ Group is full`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Group is full',
          currentCount: group.currentStudentsCount,
          maxStudents: group.maxStudents
        },
        { status: 400 }
      );
    }

    // Check if student already in group
    const studentAlreadyInGroup = group.students?.some(
      s => s.toString() === studentId.toString()
    );

    if (studentAlreadyInGroup) {
      console.log(`❌ Student already in group`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Student is already in this group'
        },
        { status: 400 }
      );
    }

    console.log(`✅ All validations passed, adding student...`);

    // Add student to group
    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      {
        $push: { students: new mongoose.Types.ObjectId(studentId) },
        $inc: { currentStudentsCount: 1 },
        $set: {
          'metadata.updatedBy': adminUser.id,
          'metadata.updatedAt': new Date()
        }
      },
      { 
        new: true,
        runValidators: false
      }
    )
      .populate('students', 'personalInfo.fullName enrollmentNumber')
      .populate('courseId', 'title level');

    if (!updatedGroup) {
      console.log(`❌ Failed to update group`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update group'
        },
        { status: 500 }
      );
    }

    console.log(`✅ Student added successfully!`);
    console.log(`📊 New student count: ${updatedGroup.currentStudentsCount}/${updatedGroup.maxStudents}`);

    // Trigger automation مع الرسالة المخصصة
    let automationResult = null;
    if (sendWhatsApp) {
      try {
        console.log('🔄 [AUTOMATION] Starting with custom message...');
        automationResult = await onStudentAddedToGroup(
          studentId, 
          id, 
          customMessage, // ✅ الرسالة المخصصة
          sendWhatsApp
        );
        console.log('✅ [AUTOMATION] Completed:', {
          success: automationResult?.success,
          messagesSent: automationResult?.messagesSent,
          studentWhatsapp: automationResult?.studentWhatsappNumber ? 'Yes' : 'No',
          guardianWhatsapp: automationResult?.guardianWhatsappNumber ? 'Yes' : 'No'
        });
      } catch (error) {
        console.error('❌ [AUTOMATION] Failed:', error.message);
        automationResult = {
          success: false,
          error: error.message
        };
      }
    } else {
      console.log('⚠️ [AUTOMATION] WhatsApp sending disabled');
    }

    return NextResponse.json({
      success: true,
      message: 'Student added to group successfully',
      data: {
        group: {
          id: updatedGroup._id,
          code: updatedGroup.code,
          name: updatedGroup.name,
          currentStudents: updatedGroup.currentStudentsCount,
          maxStudents: updatedGroup.maxStudents,
          availableSeats: updatedGroup.maxStudents - updatedGroup.currentStudentsCount,
          status: updatedGroup.status
        },
        student: {
          id: student._id,
          name: student.personalInfo?.fullName,
          enrollmentNumber: student.enrollmentNumber,
          whatsappNumber: student.personalInfo?.whatsappNumber,
          guardianWhatsappNumber: student.guardianInfo?.whatsappNumber,
          guardianName: student.guardianInfo?.name
        }
      },
      automation: {
        triggered: sendWhatsApp,
        status: automationResult?.success ? 'sent' : 'failed',
        customMessage: !!customMessage,
        messagesSent: {
          student: automationResult?.messagesSent?.student || false,
          guardian: automationResult?.messagesSent?.guardian || false
        },
        result: automationResult
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [ADD-STUDENT] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred',
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { 
          stack: error.stack 
        })
      },
      { status: 500 }
    );
  }
}