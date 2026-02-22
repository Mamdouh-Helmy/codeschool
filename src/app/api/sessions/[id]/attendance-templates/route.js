// /src/app/api/sessions/[id]/attendance-templates/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getAttendanceTemplatesForFrontend } from '../../../../services/groupAutomation';
import { requireAdmin } from '@/utils/authMiddleware';

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id } = await params;

    // ✅ FIX: استخدام req.text() بدل req.json() عشان نتحكم في الـ parse بأمان
    let body = {};
    try {
      const text = await req.text();
      if (text?.trim()) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { attendanceStatus, studentId, extraData = {} } = body;

    if (!attendanceStatus || !studentId) {
      return NextResponse.json(
        { success: false, error: 'attendanceStatus and studentId are required' },
        { status: 400 }
      );
    }

    if (!['absent', 'late', 'excused'].includes(attendanceStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid attendance status' },
        { status: 400 }
      );
    }

    console.log(`\n📋 Fetching attendance templates for session: ${id}`);
    console.log(`   Status: ${attendanceStatus}, Student: ${studentId}`);

    const templates = await getAttendanceTemplatesForFrontend(attendanceStatus, studentId, extraData);

    console.log(`✅ Templates fetched:`, {
      hasGuardian: !!templates.guardian,
      guardianContent: templates.guardian?.content
        ? templates.guardian.content.substring(0, 50) + '...'
        : null
    });

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('❌ Error fetching attendance templates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}