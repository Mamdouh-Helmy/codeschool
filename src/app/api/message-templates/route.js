// /src/app/api/message-templates/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MessageTemplate from '../../models/MessageTemplate';
import { requireAdmin } from '@/utils/authMiddleware';

// GET: جلب القوالب مع إمكانية التصفية
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const templateType = searchParams.get('type');
    const recipientType = searchParams.get('recipient');
    const isDefault = searchParams.get('default') === 'true';
    const isActive = searchParams.get('active') !== 'false';

    const query = { isActive };
    if (templateType) query.templateType = templateType;
    if (recipientType) query.recipientType = recipientType;
    if (isDefault) query.isDefault = true;

    const templates = await MessageTemplate.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// في /src/app/api/message-templates/route.js - دالة POST
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    console.log('📥 Creating template with data:', body);
    
    const { templateType, recipientType, name, contentAr, contentEn, description, variables, isDefault } = body;

    // التحقق من الحقول المطلوبة
    if (!templateType) {
      return NextResponse.json(
        { success: false, error: 'templateType is required' },
        { status: 400 }
      );
    }
    if (!recipientType) {
      return NextResponse.json(
        { success: false, error: 'recipientType is required' },
        { status: 400 }
      );
    }
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      );
    }
    if (!contentAr && !contentEn) {
      return NextResponse.json(
        { success: false, error: 'At least one language content is required' },
        { status: 400 }
      );
    }

    // التحقق من صحة templateType
    const validTypes = [
      "student_welcome",
      "guardian_notification",
      "absence_notification",
      "late_notification",
      "excused_notification",
      "session_cancelled_student",
      "session_cancelled_guardian",
      "session_postponed_student",
      "session_postponed_guardian",
      "reminder_24h_student",
      "reminder_24h_guardian",
      "reminder_1h_student",
      "reminder_1h_guardian",
      "group_completion_student",
      "group_completion_guardian",
    ];

    if (!validTypes.includes(templateType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template type' },
        { status: 400 }
      );
    }

    // إنشاء القالب
    const template = await MessageTemplate.create({
      templateType,
      recipientType,
      name,
      contentAr: contentAr || '',
      contentEn: contentEn || '',
      description: description || '',
      variables: variables || [],
      isDefault: isDefault || false,
      isActive: true,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
      usageStats: {
        totalSent: 0,
        lastUsedAt: null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      data: template
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// في /src/app/api/message-templates/route.js - دالة PUT
export async function PUT(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    console.log('📥 Updating template with data:', body);
    
    const { id, name, contentAr, contentEn, description, variables, isDefault, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // البحث عن القالب
    const template = await MessageTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // تحديث الحقول المسموح بها
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (contentAr !== undefined) updates.contentAr = contentAr;
    if (contentEn !== undefined) updates.contentEn = contentEn;
    if (description !== undefined) updates.description = description;
    if (variables !== undefined) updates.variables = variables;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    if (isActive !== undefined) updates.isActive = isActive;

    updates.updatedBy = adminUser.id;
    updates.updatedAt = new Date();

    // إذا كان isDefault = true، تأكد من عدم وجود قالب افتراضي آخر لنفس النوع
    if (updates.isDefault) {
      await MessageTemplate.updateMany(
        { 
          templateType: template.templateType, 
          recipientType: template.recipientType,
          isDefault: true, 
          _id: { $ne: id } 
        },
        { $set: { isDefault: false } }
      );
    }

    // تحديث القالب
    const updatedTemplate = await MessageTemplate.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate
    });

  } catch (error) {
    console.error('❌ Error updating template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: حذف قالب
export async function DELETE(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const template = await MessageTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // لا تسمح بحذف القالب الافتراضي
    if (template.isDefault) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete default template. Set another template as default first.' 
        },
        { status: 400 }
      );
    }

    await template.deleteOne();

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}