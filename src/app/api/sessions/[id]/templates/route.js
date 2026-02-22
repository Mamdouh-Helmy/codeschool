// /src/app/api/sessions/[id]/templates/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getTemplatesForFrontend } from '../../../../services/groupAutomation';
import Student from '../../../../models/Student';
import Session from '../../../../models/Session';
import { requireAdmin } from '@/utils/authMiddleware';

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { eventType, studentId, extraData = {} } = body;

    if (!eventType || !studentId) {
      return NextResponse.json(
        { success: false, error: 'eventType and studentId are required' },
        { status: 400 }
      );
    }

    const [student, session] = await Promise.all([
      Student.findById(studentId).lean(),
      Session.findById(id).populate('groupId').lean(),
    ]);

    if (!student) return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    if (!session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });

    const group = session.groupId;
    const templates = await getTemplatesForFrontend(eventType, studentId, extraData);

    const lang = student.communicationPreferences?.preferredLanguage || 'ar';
    const gender = (student.personalInfo?.gender || 'male').toLowerCase().trim();
    const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase().trim();

    const studentFirstName = lang === 'ar'
      ? (student.personalInfo?.nickname?.ar?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب')
      : (student.personalInfo?.nickname?.en?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'Student');

    const guardianFirstName = lang === 'ar'
      ? (student.guardianInfo?.nickname?.ar?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر')
      : (student.guardianInfo?.nickname?.en?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'Guardian');

    let studentSalutation = lang === 'ar'
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

    const sessionDate = session.scheduledDate
      ? new Date(session.scheduledDate).toLocaleDateString(
          lang === 'ar' ? 'ar-EG' : 'en-US',
          { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        )
      : '';

    const variables = {
      studentSalutation,
      guardianSalutation,
      salutation: guardianSalutation,
      studentName: studentFirstName,
      studentFullName: student.personalInfo?.fullName || '',
      guardianName: guardianFirstName,
      guardianFullName: student.guardianInfo?.name || '',
      childTitle,
      sessionName: session.title || '',
      date: sessionDate,
      time: `${session.startTime || ''} - ${session.endTime || ''}`,
      meetingLink: extraData.meetingLink || session.meetingLink || '',
      groupCode: group?.code || '',
      groupName: group?.name || '',
      enrollmentNumber: student.enrollmentNumber || '',
      newDate: extraData.newDate
        ? new Date(extraData.newDate).toLocaleDateString(
            lang === 'ar' ? 'ar-EG' : 'en-US',
            { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
          )
        : '',
      newTime: extraData.newTime || '',
    };

    const replaceVars = (content) => {
      if (!content) return '';
      return Object.entries(variables).reduce((msg, [key, val]) => {
        return msg.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val ?? ''));
      }, content);
    };

    return NextResponse.json({
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
      }
    });

  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}