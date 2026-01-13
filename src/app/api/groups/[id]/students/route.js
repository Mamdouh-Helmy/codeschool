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

    // طريقة 1: من خلال reference مباشر
    const students = await Student.find({
      'academicInfo.groupIds': new mongoose.Types.ObjectId(id),
      isDeleted: false
    })
    .select('personalInfo.fullName personalInfo.email personalInfo.phone enrollmentNumber guardianInfo.name guardianInfo.whatsappNumber academicInfo.groupIds')
    .sort({ 'personalInfo.fullName': 1 })
    .lean();

    console.log(`📊 Found ${students.length} students in group ${group.name} (method 1)`);

    // طريقة 2: من خلال المجموعة نفسها (إذا كان هناك reference)
    if (students.length === 0) {
      const groupWithRefs = await Group.findById(id)
        .populate({
          path: 'students',
          select: 'personalInfo.fullName personalInfo.email personalInfo.phone enrollmentNumber guardianInfo.name guardianInfo.whatsappNumber',
          match: { isDeleted: false }
        })
        .lean();

      if (groupWithRefs?.students) {
        students = groupWithRefs.students;
        console.log(`📊 Found ${students.length} students (method 2)`);
      }
    }

    const formattedStudents = students.map(student => ({
      id: student._id,
      _id: student._id,
      personalInfo: {
        fullName: student.personalInfo?.fullName || 'Unknown Student',
        email: student.personalInfo?.email || '',
        phone: student.personalInfo?.phone || '',
        enrollmentNumber: student.enrollmentNumber || 'N/A'
      },
      guardianInfo: {
        name: student.guardianInfo?.name || '',
        whatsappNumber: student.guardianInfo?.whatsappNumber || ''
      }
    }));

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