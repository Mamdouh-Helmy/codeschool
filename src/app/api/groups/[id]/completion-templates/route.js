// /src/app/api/groups/[id]/completion-templates/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '../../../../models/Student';
import Group from '../../../../models/Group';
import Course from '../../../../models/Course';
import { requireAdmin } from '@/utils/authMiddleware';
import { getTemplatesForEvent } from '@/app/services/groupAutomation';
import mongoose from 'mongoose';

export async function POST(req, { params }) {
  try {
    console.log(`\n🎯 ========== FETCH COMPLETION TEMPLATES ==========`);
    
    // التحقق من صلاحيات المدير
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log('❌ Unauthorized access attempt');
      return authCheck.response;
    }

    await connectDB();

    // ✅ استخراج id بشكل آمن مع التحقق
    const { id } = await params;
    console.log(`📋 Group ID from params:`, id);

    // ✅ التحقق من صحة الـ groupId
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      console.error(`❌ Invalid group ID:`, id);
      return NextResponse.json(
        { success: false, error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    const body = await req.json();
    console.log(`📦 Request body:`, body);
    
    const { studentId, feedbackLink } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'studentId is required' },
        { status: 400 }
      );
    }

    // التحقق من صحة الـ studentId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid student ID format' },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching student: ${studentId}`);
    console.log(`🔍 Fetching group: ${id}`);

    // جلب الطالب
    const student = await Student.findById(studentId).lean();
    
    if (!student) {
      console.error(`❌ Student not found: ${studentId}`);
      return NextResponse.json(
        { success: false, error: 'Student not found' }, 
        { status: 404 }
      );
    }

    // ✅ جلب المجموعة مع populate كامل للكورس
    const group = await Group.findById(id)
      .populate({
        path: 'courseId',
        select: 'title level description',
        model: Course
      })
      .lean();

    if (!group) {
      console.error(`❌ Group not found: ${id}`);
      return NextResponse.json(
        { success: false, error: 'Group not found' }, 
        { status: 404 }
      );
    }

    console.log(`✅ Student found: ${student.personalInfo?.fullName}`);
    console.log(`✅ Group found: ${group.name} (${group.code})`);
    
    // ✅ تسجيل بيانات الكورس للتحقق
    console.log(`📚 Course data from group:`, {
      courseId: group.courseId,
      courseSnapshot: group.courseSnapshot,
      courseIdTitle: group.courseId?.title,
      courseSnapshotTitle: group.courseSnapshot?.title
    });

    // ✅ إذا كان courseId موجود ولكن بدون title (لأنه ObjectId فقط)، حاول جلبه بشكل منفصل
    let courseTitle = null;
    if (group.courseId && typeof group.courseId === 'object' && group.courseId.title) {
      courseTitle = group.courseId.title;
      console.log(`📚 Course title from populated courseId:`, courseTitle);
    } else if (group.courseSnapshot?.title) {
      courseTitle = group.courseSnapshot.title;
      console.log(`📚 Course title from courseSnapshot:`, courseTitle);
    } else if (group.courseId && mongoose.Types.ObjectId.isValid(group.courseId.toString())) {
      // محاولة جلب الكورس بشكل منفصل
      try {
        const course = await Course.findById(group.courseId).select('title').lean();
        if (course) {
          courseTitle = course.title;
          console.log(`📚 Course title fetched separately:`, courseTitle);
        }
      } catch (courseError) {
        console.warn(`⚠️ Could not fetch course separately:`, courseError.message);
      }
    }

    // جلب القوالب من الـ automation service
    console.log(`📋 Fetching templates for group_completion event...`);
    const templates = await getTemplatesForEvent('group_completion', student, { 
      feedbackLink,
      courseName: courseTitle // تمرير اسم الكورس إذا تم العثور عليه
    });
    
    console.log(`✅ Templates fetched:`, {
      hasStudent: !!templates.student,
      hasGuardian: !!templates.guardian,
      studentContentLength: templates.student?.content?.length,
      guardianContentLength: templates.guardian?.content?.length
    });

    // بناء المتغيرات للطالب الحالي
    const lang = student.communicationPreferences?.preferredLanguage || 'ar';
    const gender = (student.personalInfo?.gender || 'male').toLowerCase().trim();
    const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase().trim();

    console.log(`📊 Student data:`, { 
      lang, 
      gender, 
      relationship,
      fullName: student.personalInfo?.fullName 
    });

    // أسماء مختصرة
    const studentFirstName = lang === 'ar'
      ? (student.personalInfo?.nickname?.ar?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب')
      : (student.personalInfo?.nickname?.en?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'Student');

    const guardianFirstName = lang === 'ar'
      ? (student.guardianInfo?.nickname?.ar?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر')
      : (student.guardianInfo?.nickname?.en?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'Guardian');

    console.log(`📝 Names:`, { studentFirstName, guardianFirstName });

    // تحيات مخصصة
    const studentSalutation = lang === 'ar'
      ? (gender === 'female' ? `عزيزتي ${studentFirstName}` : `عزيزي ${studentFirstName}`)
      : `Dear ${studentFirstName}`;

    let guardianSalutation = '';
    if (lang === 'ar') {
      if (relationship === 'mother') guardianSalutation = `عزيزتي السيدة ${guardianFirstName}`;
      else if (relationship === 'father') guardianSalutation = `عزيزي الأستاذ ${guardianFirstName}`;
      else guardianSalutation = `عزيزي/عزيزتي ${guardianFirstName}`;
    } else {
      if (relationship === 'mother') guardianSalutation = `Dear Mrs. ${guardianFirstName}`;
      else if (relationship === 'father') guardianSalutation = `Dear Mr. ${guardianFirstName}`;
      else guardianSalutation = `Dear ${guardianFirstName}`;
    }

    const childTitle = lang === 'ar'
      ? (gender === 'female' ? 'ابنتك' : 'ابنك')
      : (gender === 'female' ? 'your daughter' : 'your son');

    console.log(`📝 Salutations:`, { studentSalutation, guardianSalutation, childTitle });

    // ✅ تحديد اسم الكورس من مصادر متعددة
    const finalCourseName = courseTitle || 
                            group.courseSnapshot?.title || 
                            group.courseId?.title || 
                            (lang === 'ar' ? 'الدورة' : 'Course');

    console.log(`📚 Final course name:`, finalCourseName);

    const variables = {
      studentSalutation,
      guardianSalutation,
      salutation: guardianSalutation, // للتوافق
      studentName: studentFirstName,
      studentFullName: student.personalInfo?.fullName || '',
      guardianName: guardianFirstName,
      guardianFullName: student.guardianInfo?.name || '',
      childTitle,
      groupName: group.name || '',
      groupCode: group.code || '',
      courseName: finalCourseName, // ✅ استخدام القيمة المحسنة
      enrollmentNumber: student.enrollmentNumber || '',
      feedbackLink: feedbackLink || '',
    };

    console.log(`✅ Variables built successfully with ${Object.keys(variables).length} keys`);
    console.log(`📋 Variables sample:`, {
      courseName: variables.courseName,
      groupName: variables.groupName,
      studentName: variables.studentName
    });

    // دالة استبدال المتغيرات
    const replaceVars = (content) => {
      if (!content) return '';
      let result = content;
      Object.entries(variables).forEach(([key, val]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(regex, String(val ?? ''));
      });
      return result;
    };

    // تجهيز الاستجابة
    const response = {
      success: true,
      data: {
        student: templates.student ? {
          ...templates.student,
          content: replaceVars(templates.student.content),
          rawContent: templates.student.content,
        } : null,
        guardian: templates.guardian ? {
          ...templates.guardian,
          content: replaceVars(templates.guardian.content),
          rawContent: templates.guardian.content,
        } : null,
        variables,
        metadata: {
          courseName: finalCourseName,
          groupName: group.name,
          studentName: student.personalInfo?.fullName,
          language: lang
        }
      }
    };

    console.log(`✅ Response prepared successfully`);
    console.log(`📤 Sending response with courseName:`, response.data.variables.courseName);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error(`❌ Error fetching completion templates:`, error);
    console.error(`❌ Stack:`, error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch templates',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET: التحقق من وجود القوالب (اختياري)
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID format' },
        { status: 400 }
      );
    }

    const group = await Group.findById(id)
      .populate('courseId', 'title')
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        groupId: group._id,
        groupName: group.name,
        courseName: group.courseId?.title || group.courseSnapshot?.title || null,
        hasTemplates: true
      }
    });

  } catch (error) {
    console.error('❌ Error in GET completion-templates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}