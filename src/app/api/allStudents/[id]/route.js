import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '../../../models/Student';
import User from '../../../models/User';
import { requireAdmin } from '@/utils/authMiddleware';
import mongoose from 'mongoose';

// تحقق من أن Content-Type هو application/json
const validateContentType = (req) => {
  const contentType = req.headers.get('content-type');
  if (req.method === 'PUT' || req.method === 'PATCH') {
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Content-Type must be application/json',
          required: 'application/json',
          received: contentType || 'none'
        },
        { status: 415 }
      );
    }
  }
  return null;
};

// GET: الحصول على طالب محدد
export async function GET(req, { params }) {
  try {
    console.log(`🔍 Fetching student with ID: ${params.id}`);
    
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log('❌ Admin authorization failed');
      return authCheck.response;
    }

    await connectDB();

    const { id } = params;

    // التحقق من صحة معرف MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`❌ Invalid student ID format: ${id}`);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid student ID format',
          error: 'ID must be a valid MongoDB ObjectId' 
        },
        { status: 400 }
      );
    }

    // التحقق من أن الطالب غير محذوف
    const student = await Student.findOne({ 
      _id: id, 
      isDeleted: false 
    })
      .populate('authUserId', 'name email role')
      .populate('metadata.createdBy', 'name email')
      .populate('metadata.lastModifiedBy', 'name email')
      .populate('enrollmentInfo.referredBy', 'personalInfo.fullName enrollmentNumber')
      .populate('academicInfo.groupIds', 'name description')
      .populate({
        path: 'academicInfo.currentCourses.courseId',
        select: 'title code instructor duration'
      });

    if (!student) {
      console.log(`❌ Student not found or deleted: ${id}`);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Student not found or has been deleted',
          suggestion: 'Check if student exists or has been soft deleted' 
        },
        { status: 404 }
      );
    }

    console.log(`✅ Student retrieved successfully: ${student.enrollmentNumber}`);

    // تنسيق البيانات للإرجاع
    const formattedStudent = {
      id: student._id,
      enrollmentNumber: student.enrollmentNumber,
      authUserId: student.authUserId,
      personalInfo: student.personalInfo,
      guardianInfo: student.guardianInfo,
      enrollmentInfo: student.enrollmentInfo,
      academicInfo: student.academicInfo,
      communicationPreferences: student.communicationPreferences,
      metadata: {
        createdAt: student.metadata.createdAt,
        updatedAt: student.metadata.updatedAt,
        createdBy: student.metadata.createdBy,
        lastModifiedBy: student.metadata.lastModifiedBy
      },
      isDeleted: student.isDeleted
    };

    return NextResponse.json({
      success: true,
      message: 'Student retrieved successfully',
      data: formattedStudent
    }, { status: 200 });

  } catch (error) {
    console.error(`❌ Error fetching student ${params.id}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch student',
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    console.log(`✏️ Updating student with ID: ${params.id}`);
    
    // التحقق من Content-Type
    const contentTypeError = validateContentType(req);
    if (contentTypeError) return contentTypeError;
    
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log('❌ Admin authorization failed');
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    console.log(`👤 Admin performing update: ${adminUser.email}`);

    await connectDB();

    const { id } = params;
    const updateData = await req.json();
    
    console.log('📥 Update data received:', JSON.stringify(updateData, null, 2));

    // التحقق من صحة معرف MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`❌ Invalid student ID format: ${id}`);
      return NextResponse.json(
        { success: false, message: 'Invalid student ID format' },
        { status: 400 }
      );
    }

    // التحقق من وجود الطالب وغير محذوف
    const existingStudent = await Student.findOne({ 
      _id: id, 
      isDeleted: false 
    });
    
    if (!existingStudent) {
      console.log(`❌ Student not found or deleted: ${id}`);
      return NextResponse.json(
        { success: false, message: 'Student not found or has been deleted' },
        { status: 404 }
      );
    }

    // تنظيف البيانات
    const cleanUpdateData = {
      ...updateData,
      // إذا كان authUserId فارغًا، ضععه null
      authUserId: updateData.authUserId && updateData.authUserId.trim() !== '' 
        ? updateData.authUserId 
        : null,
      // تنظيف referredBy إذا كان فارغًا
      enrollmentInfo: updateData.enrollmentInfo ? {
        ...updateData.enrollmentInfo,
        referredBy: updateData.enrollmentInfo.referredBy && updateData.enrollmentInfo.referredBy.trim() !== ''
          ? updateData.enrollmentInfo.referredBy
          : null
      } : undefined
    };

    // إزالة الحقول غير القابلة للتحديث
    const restrictedFields = [
      '_id',
      'enrollmentNumber',
      'metadata.createdAt',
      'metadata.createdBy',
      'isDeleted',
      'deletedAt'
    ];
    
    restrictedFields.forEach(field => {
      const parts = field.split('.');
      if (parts.length === 1) {
        delete cleanUpdateData[field];
      } else if (parts.length === 2) {
        if (cleanUpdateData[parts[0]]) {
          delete cleanUpdateData[parts[0]][parts[1]];
        }
      }
    });

    console.log('🛡 Restricted fields removed from update data');

    // التحقق من تحديث رقم الواتساب للاتوميشن
    const whatsappNumberChanged = 
      cleanUpdateData.personalInfo?.whatsappNumber && 
      cleanUpdateData.personalInfo.whatsappNumber !== existingStudent.personalInfo.whatsappNumber;

    // إعداد بيانات التحديث
    const updatePayload = {
      ...cleanUpdateData,
      'metadata.lastModifiedBy': adminUser.id,
      'metadata.updatedAt': new Date()
    };

    console.log('🔄 Executing database update...');

    // تنفيذ التحديث مع التحقق من الصحة
    const updatedStudent = await Student.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updatePayload },
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    )
      .populate('metadata.lastModifiedBy', 'name email')
      .populate('authUserId', 'name email');

    if (!updatedStudent) {
      console.log(`❌ Student update failed for ID: ${id}`);
      return NextResponse.json(
        { success: false, message: 'Failed to update student' },
        { status: 500 }
      );
    }

    console.log(`✅ Student updated successfully: ${updatedStudent.enrollmentNumber}`);

    // 🔥 **تشغيل اتوميشن الواتساب إذا تم تغيير رقم الواتساب أو البيانات المهمة**
    if (whatsappNumberChanged) {
      console.log('📱 WhatsApp number changed, triggering update notification...');
      
      // تشغيل الاتوميشن في الخلفية
      setTimeout(async () => {
        try {
          // استيراد ديناميكي لتجنب التبعيات الدائرية
          const { whatsappService } = await import('@/app/services/whatsappService');
          const result = await whatsappService.sendUpdateNotification(updatedStudent);
          console.log('✅ WhatsApp update notification sent:', result);
        } catch (automationError) {
          console.error('❌ WhatsApp automation failed:', automationError);
        }
      }, 0);
    }

    return NextResponse.json({
      success: true,
      message: 'Student updated successfully',
      data: {
        id: updatedStudent._id,
        enrollmentNumber: updatedStudent.enrollmentNumber,
        fullName: updatedStudent.personalInfo.fullName,
        updatedFields: Object.keys(cleanUpdateData),
        metadata: {
          lastModifiedBy: updatedStudent.metadata.lastModifiedBy,
          updatedAt: updatedStudent.metadata.updatedAt
        },
        whatsappUpdate: whatsappNumberChanged ? {
          triggered: true,
          status: 'notification_scheduled',
          note: 'WhatsApp update notification will be sent in background'
        } : {
          triggered: false,
          reason: 'WhatsApp number not changed'
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error(`❌ Error updating student ${params.id}:`, error);
    
    // معالجة أخطاء فريدة MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.error(`❌ Duplicate field error: ${field}`, error.keyValue);
      return NextResponse.json(
        { 
          success: false, 
          message: `Data already exists`,
          field: field,
          value: error.keyValue[field],
          suggestion: 'Use a unique value for this field'
        },
        { status: 409 }
      );
    }

    // معالجة أخطاء التحقق من صحة Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      console.error('❌ Validation errors:', errors);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed',
          errors: errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update student',
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

// DELETE: حذف طري للطالب
export async function DELETE(req, { params }) {
  try {
    console.log(`🗑️ Soft deleting student with ID: ${params.id}`);
    
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log('❌ Admin authorization failed');
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    console.log(`👤 Admin performing deletion: ${adminUser.email}`);

    await connectDB();

    const { id } = params;

    // التحقق من صحة معرف MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`❌ Invalid student ID format: ${id}`);
      return NextResponse.json(
        { success: false, message: 'Invalid student ID format' },
        { status: 400 }
      );
    }

    // التحقق من أن الطالب موجود وغير محذوف مسبقاً
    const existingStudent = await Student.findOne({ 
      _id: id, 
      isDeleted: false 
    });

    if (!existingStudent) {
      console.log(`❌ Student not found or already deleted: ${id}`);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Student not found or has already been deleted',
          suggestion: 'Check student status or restore from trash if needed'
        },
        { status: 404 }
      );
    }

    // حذف طري (Soft Delete)
    const deletedStudent = await Student.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          'enrollmentInfo.status': 'Dropped',
          'metadata.lastModifiedBy': adminUser.id,
          'metadata.updatedAt': new Date()
        }
      },
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!deletedStudent) {
      console.log(`❌ Soft delete failed for student: ${id}`);
      return NextResponse.json(
        { success: false, message: 'Failed to delete student' },
        { status: 500 }
      );
    }

    console.log(`✅ Student soft deleted successfully: ${deletedStudent.enrollmentNumber}`);

    // 🔥 **تشغيل اتوميشن الواتساب لإرسال إشعار الحذف**
    setTimeout(async () => {
      try {
        console.log(`📧 Sending deletion notification for student: ${deletedStudent.enrollmentNumber}`);
        
        // استيراد ديناميكي لخدمة الواتساب
        const { whatsappService } = await import('@/app/services/whatsappService');
        const result = await whatsappService.sendDeletionNotification(deletedStudent);
        console.log('✅ WhatsApp deletion notification sent:', result);
      } catch (notificationError) {
        console.error('❌ Deletion notification failed:', notificationError);
      }
    }, 0);

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully (soft delete)',
      data: {
        id: deletedStudent._id,
        enrollmentNumber: deletedStudent.enrollmentNumber,
        fullName: deletedStudent.personalInfo.fullName,
        deletedAt: deletedStudent.deletedAt,
        status: deletedStudent.enrollmentInfo.status,
        canBeRestored: true,
        restorationNote: 'Student can be restored within 30 days',
        notification: {
          whatsapp: 'Deletion notification scheduled for sending'
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error(`❌ Error deleting student ${params.id}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete student',
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

// PATCH: استعادة طالب محذوف
export async function PATCH(req, { params }) {
  try {
    console.log(`🔄 Restoring student with ID: ${params.id}`);
    
    // التحقق من Content-Type
    const contentTypeError = validateContentType(req);
    if (contentTypeError) return contentTypeError;
    
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log('❌ Admin authorization failed');
      return authCheck.response;
    }

    await connectDB();

    const { id } = params;
    
    // التحقق من صحة معرف MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`❌ Invalid student ID format: ${id}`);
      return NextResponse.json(
        { success: false, message: 'Invalid student ID format' },
        { status: 400 }
      );
    }

    // استعادة الطالب المحذوف
    const restoredStudent = await Student.findOneAndUpdate(
      { _id: id, isDeleted: true },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          'enrollmentInfo.status': 'Active',
          'metadata.updatedAt': new Date()
        }
      },
      { new: true }
    );

    if (!restoredStudent) {
      console.log(`❌ Student not found in trash or already restored: ${id}`);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Student not found in trash or already restored',
          suggestion: 'Check if student exists or is already active' 
        },
        { status: 404 }
      );
    }

    console.log(`✅ Student restored successfully: ${restoredStudent.enrollmentNumber}`);

    return NextResponse.json({
      success: true,
      message: 'Student restored successfully',
      data: {
        id: restoredStudent._id,
        enrollmentNumber: restoredStudent.enrollmentNumber,
        fullName: restoredStudent.personalInfo.fullName,
        restoredAt: new Date(),
        status: restoredStudent.enrollmentInfo.status
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error restoring student:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to restore student', 
        error: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}