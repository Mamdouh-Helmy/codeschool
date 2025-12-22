import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '../../models/Student';
import User from '../../models/User';
import { generateEnrollmentNumber } from '@/utils/enrollmentGenerator';
import { requireAdmin } from '@/utils/authMiddleware';
import mongoose from 'mongoose';

export async function POST(req) {
  try {
    console.log('🚀 Starting student creation process...');

    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log('❌ Admin authorization failed Retrn');
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    console.log('✅ Admin verified:', adminUser.email);

    await connectDB();
    console.log('✅ Database connected');

    // تحليل بيانات الطلب
    const studentData = await req.json();
    console.log('📥 Received student data:', JSON.stringify(studentData, null, 2));

    // التحقق من البيانات المطلوبة (بدون authUserId)
    const requiredFields = [
      'personalInfo.fullName',
      'personalInfo.email',
      'personalInfo.phone',
      'personalInfo.whatsappNumber',
      'personalInfo.dateOfBirth',
      'personalInfo.gender',
      'personalInfo.nationalId',
      'guardianInfo.name',
      'guardianInfo.relationship',
      'guardianInfo.phone',
      'enrollmentInfo.source'
    ];

    const missingFields = requiredFields.filter(field => {
      const value = field.split('.').reduce((obj, key) => obj && obj[key], studentData);
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields', 
          fields: missingFields 
        },
        { status: 400 }
      );
    }

    // تنظيف البيانات
    const cleanData = {
      ...studentData,
      // إذا كان authUserId فارغًا، ضععه null
      authUserId: studentData.authUserId && studentData.authUserId.trim() !== '' 
        ? studentData.authUserId 
        : null,
      // تنظيف referredBy
      enrollmentInfo: {
        ...studentData.enrollmentInfo,
        referredBy: studentData.enrollmentInfo?.referredBy && studentData.enrollmentInfo.referredBy.trim() !== ''
          ? studentData.enrollmentInfo.referredBy
          : null
      }
    };

    // التحقق من وجود المستخدم فقط إذا تم إرسال authUserId
    if (cleanData.authUserId) {
      console.log('🔍 Checking user exists...');
      const userExists = await User.findById(cleanData.authUserId);
      if (!userExists) {
        console.log('❌ User not found:', cleanData.authUserId);
        return NextResponse.json(
          { success: false, message: 'User not found with provided authUserId' },
          { status: 404 }
        );
      }
      console.log('✅ User found:', userExists.email);

      // التحقق من أن المستخدم ليس لديه طالب مسجل مسبقًا
      const existingStudent = await Student.findOne({ 
        authUserId: cleanData.authUserId,
        isDeleted: false 
      });
      if (existingStudent) {
        console.log('❌ Student already exists for user');
        return NextResponse.json(
          { 
            success: false, 
            message: 'User already has a student profile',
            existingStudentId: existingStudent._id 
          },
          { status: 409 }
        );
      }
      console.log('✅ No existing student found for this user');
    } else {
      console.log('📝 Creating student without user account link');
    }

    // توليد رقم التسجيل
    console.log('🔢 Generating enrollment number...');
    const enrollmentNumber = await generateEnrollmentNumber();
    console.log('✅ Enrollment number generated:', enrollmentNumber);

    // إنشاء سجل الطالب
    console.log('📝 Creating student record...');
    const newStudent = new Student({
      ...cleanData,
      enrollmentNumber,
      metadata: {
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // الحفظ في قاعدة البيانات
    console.log('💾 Saving student to database...');
    const savedStudent = await newStudent.save();
    console.log('✅ Student saved successfully:', savedStudent._id);

    // 🔥 **تنفيذ WhatsApp Automation (بشكل غير متزامن)**
    console.log('📱 Triggering WhatsApp automation...');
    
    // تشغيل الاتوميشن في الخلفية دون انتظار
    setTimeout(async () => {
      try {
        console.log('🔄 Starting WhatsApp automation in background...');
        
        // استيراد ديناميكي لتجنب التبعيات الدائرية
        const { whatsappService } = await import('@/app/services/whatsappService');
        const whatsappResult = await whatsappService.sendWelcomeMessage(savedStudent);
        
        console.log('✅ WhatsApp automation completed:', whatsappResult);
        
      } catch (automationError) {
        console.error('❌ WhatsApp automation failed:', automationError);
      }
    }, 0);

    // إرجاع الاستجابة الناجحة
    return NextResponse.json({
      success: true,
      message: cleanData.authUserId 
        ? 'Student created successfully (linked to user account)' 
        : 'Student created successfully (without user account link)',
      data: {
        student: {
          id: savedStudent._id,
          enrollmentNumber: savedStudent.enrollmentNumber,
          fullName: savedStudent.personalInfo.fullName,
          email: savedStudent.personalInfo.email,
          status: savedStudent.enrollmentInfo.status,
          whatsappNumber: savedStudent.personalInfo.whatsappNumber,
          hasUserAccount: !!cleanData.authUserId
        },
        automation: {
          triggered: true,
          message: 'WhatsApp welcome automation has been triggered in background',
          note: 'Check server logs for automation results'
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating student:', error);
    
    // معالجة أخطاء فريدة MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      console.error('❌ Duplicate field error:', field);
      return NextResponse.json(
        { 
          success: false, 
          message: `Data already exists: ${field}`,
          field: field,
          value: error.keyValue[field]
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
        message: 'Failed to create student', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET: الحصول على جميع الطلاب (مع التصفية والتخطيط)
export async function GET(req) {
  try {
    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    // الحصول على معاملات البحث والترشيح
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const level = searchParams.get('level');
    const source = searchParams.get('source');

    // بناء استعلام البحث
    const query = { isDeleted: false };

    if (status) {
      query['enrollmentInfo.status'] = status;
    }

    if (level) {
      query['academicInfo.level'] = level;
    }

    if (source) {
      query['enrollmentInfo.source'] = source;
    }

    if (search) {
      query['$or'] = [
        { 'personalInfo.fullName': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } },
        { enrollmentNumber: { $regex: search, $options: 'i' } },
        { 'personalInfo.phone': { $regex: search, $options: 'i' } },
        { 'personalInfo.nationalId': { $regex: search, $options: 'i' } }
      ];
    }

    // حساب التخطيط
    const totalStudents = await Student.countDocuments(query);
    const totalPages = Math.ceil(totalStudents / limit);
    const skip = (page - 1) * limit;

    // جلب البيانات مع التخطيط
    const students = await Student.find(query)
      .populate('authUserId', 'name email role')
      .populate('metadata.createdBy', 'name email')
      .populate('enrollmentInfo.referredBy', 'personalInfo.fullName enrollmentNumber')
      .sort({ 'metadata.createdAt': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // تنسيق البيانات للإرجاع
    const formattedStudents = students.map(student => ({
      id: student._id,
      enrollmentNumber: student.enrollmentNumber,
      personalInfo: student.personalInfo,
      guardianInfo: student.guardianInfo,
      enrollmentInfo: student.enrollmentInfo,
      academicInfo: student.academicInfo,
      communicationPreferences: student.communicationPreferences,
      createdAt: student.metadata.createdAt,
      createdBy: student.metadata.createdBy,
      authUserId: student.authUserId
    }));

    return NextResponse.json({
      success: true,
      data: formattedStudents,
      pagination: {
        page,
        limit,
        totalStudents,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch students', error: error.message },
      { status: 500 }
    );
  }
}

// PUT: تحديث طالب
export async function PUT(req, { params }) {
  try {
    console.log(`✏️ Updating student with ID: ${params.id}`);
    
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
      // تنظيف referredBy
      enrollmentInfo: updateData.enrollmentInfo ? {
        ...updateData.enrollmentInfo,
        referredBy: updateData.enrollmentInfo.referredBy && updateData.enrollmentInfo.referredBy.trim() !== ''
          ? updateData.enrollmentInfo.referredBy
          : null
      } : undefined
    };

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
        restorationNote: 'Student can be restored within 30 days'
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