//api//groups/[id]/students/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Group from '../../../../models/Group';
import Student from '../../../../models/Student';
import { requireAdmin } from '@/utils/authMiddleware';
import mongoose from 'mongoose';

// GET: Get all students in a group
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    // تحقق من وجود المجموعة
    const group = await Group.findOne({ _id: id, isDeleted: false })
      .select('name code')
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    // ✅ جلب كل الطلاب في المجموعة مع كل البيانات المطلوبة
    let students = await Student.find({
      'academicInfo.groupIds': new mongoose.Types.ObjectId(id),
      isDeleted: false
    })
    .select('personalInfo enrollmentNumber guardianInfo communicationPreferences creditSystem')
    .sort({ 'personalInfo.fullName': 1 })
    .lean();

    console.log(`📊 Found ${students.length} students in group ${group.name}`);

    // ✅ التأكد من أن كل طالب عنده creditSystem حتى لو null
    const formattedStudents = students.map(student => {
      if (!student.creditSystem) {
        student.creditSystem = {
          currentPackage: null,
          status: 'no_package',
          stats: {
            totalHoursPurchased: 0,
            totalHoursUsed: 0,
            totalHoursRemaining: 0,
            totalSessionsAttended: 0
          }
        };
      }
      
      if (!student.creditSystem.currentPackage) {
        student.creditSystem.currentPackage = {
          remainingHours: 0,
          totalHours: 0,
          packageType: null,
          startDate: null,
          endDate: null,
          status: 'inactive'
        };
      }

      return {
        id: student._id,
        _id: student._id,
        enrollmentNumber: student.enrollmentNumber || 'N/A',
        personalInfo: student.personalInfo || {},
        guardianInfo: student.guardianInfo || {},
        communicationPreferences: student.communicationPreferences || { preferredLanguage: 'ar' },
        creditSystem: student.creditSystem
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedStudents,
      count: formattedStudents.length,
      group: {
        id: group._id,
        name: group.name,
        code: group.code
      }
    });

  } catch (error) {
    console.error('❌ Error fetching group students:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch group students'
      },
      { status: 500 }
    );
  }
}