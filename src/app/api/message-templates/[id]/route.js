// /src/app/api/message-templates/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MessageTemplate from '../../../models/MessageTemplate';
import { requireAdmin } from '@/utils/authMiddleware';

export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params;

    const template = await MessageTemplate.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('❌ Error fetching template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}