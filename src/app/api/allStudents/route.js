import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../models/Student";
import User from "../../models/User";
import { generateEnrollmentNumber } from "@/utils/enrollmentGenerator";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    console.log("🚀 Starting student creation process...");
    console.log("🔍 Environment check:", {
      WHATSAPP_API_TOKEN: process.env.WHATSAPP_API_TOKEN
        ? "Configured"
        : "Not configured",
      WHATSAPP_INSTANCE_ID: process.env.WHATSAPP_INSTANCE_ID || "Not set",
      NODE_ENV: process.env.NODE_ENV || "development",
    });

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log("❌ Admin authorization failed");
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    console.log("✅ Admin verified:", adminUser.email);

    await connectDB();
    console.log("✅ Database connected");

    const studentData = await req.json();
    console.log("📥 Received student data:", JSON.stringify(studentData, null, 2));

    const requiredFields = [
      "personalInfo.fullName",
      "personalInfo.email",
      "personalInfo.phone",
      "personalInfo.whatsappNumber",
      "personalInfo.dateOfBirth",
      "personalInfo.gender",
      "personalInfo.nationalId",
      "guardianInfo.name",
      "guardianInfo.relationship",
      "guardianInfo.phone",
      "enrollmentInfo.source",
    ];

    const missingFields = requiredFields.filter((field) => {
      const value = field.split(".").reduce((obj, key) => obj && obj[key], studentData);
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      console.log("❌ Missing required fields:", missingFields);
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
          fields: missingFields,
        },
        { status: 400 }
      );
    }

    // ✅ التحقق من صحة التاريخ وتحويله بشكل آمن
    let dateOfBirth = studentData.personalInfo?.dateOfBirth;
    if (dateOfBirth) {
      try {
        // إذا كان string، تحويله لـ Date object
        if (typeof dateOfBirth === 'string') {
          const dateObj = new Date(dateOfBirth);
          if (isNaN(dateObj.getTime())) {
            throw new Error("Invalid date format");
          }
          
          // ✅ التحقق من أن التاريخ ليس في المستقبل
          const today = new Date();
          today.setHours(23, 59, 59, 999); // نهاية اليوم
          
          if (dateObj > today) {
            console.error("❌ Date of birth is in the future:", dateOfBirth);
            return NextResponse.json(
              {
                success: false,
                message: "تاريخ الميلاد لا يمكن أن يكون في المستقبل",
                error: "Date of birth cannot be in the future",
              },
              { status: 400 }
            );
          }
          
          // ✅ التحقق من أن التاريخ منطقي (مثلاً ليس قبل 150 سنة)
          const minDate = new Date();
          minDate.setFullYear(minDate.getFullYear() - 150);
          
          if (dateObj < minDate) {
            console.error("❌ Date of birth is too old:", dateOfBirth);
            return NextResponse.json(
              {
                success: false,
                message: "تاريخ الميلاد غير منطقي",
                error: "Date of birth is too old",
              },
              { status: 400 }
            );
          }
          
          dateOfBirth = dateObj;
          console.log("✅ Date of birth validated:", dateOfBirth);
        }
      } catch (dateError) {
        console.error("❌ Date parsing error:", dateError);
        return NextResponse.json(
          {
            success: false,
            message: "Invalid date of birth format",
            error: dateError.message,
          },
          { status: 400 }
        );
      }
    }

    const cleanData = {
      ...studentData,
      personalInfo: {
        ...studentData.personalInfo,
        dateOfBirth: dateOfBirth, // استخدام التاريخ المحول
      },
      authUserId:
        studentData.authUserId && studentData.authUserId.trim() !== ""
          ? studentData.authUserId
          : null,
      enrollmentInfo: {
        ...studentData.enrollmentInfo,
        referredBy:
          studentData.enrollmentInfo?.referredBy &&
          studentData.enrollmentInfo.referredBy.trim() !== ""
            ? studentData.enrollmentInfo.referredBy
            : null,
      },
    };

    if (cleanData.authUserId) {
      console.log("🔍 Checking user exists...");
      const userExists = await User.findById(cleanData.authUserId);
      if (!userExists) {
        console.log("❌ User not found:", cleanData.authUserId);
        return NextResponse.json(
          {
            success: false,
            message: "User not found with provided authUserId",
          },
          { status: 404 }
        );
      }
      console.log("✅ User found:", userExists.email);

      const existingStudent = await Student.findOne({
        authUserId: cleanData.authUserId,
        isDeleted: false,
      });
      if (existingStudent) {
        console.log("❌ Student already exists for user");
        return NextResponse.json(
          {
            success: false,
            message: "User already has a student profile",
            existingStudentId: existingStudent._id,
          },
          { status: 409 }
        );
      }
      console.log("✅ No existing student found for this user");
    } else {
      console.log("📝 Creating student without user account link");
    }

    console.log("🔢 Generating enrollment number...");
    const enrollmentNumber = await generateEnrollmentNumber();
    console.log("✅ Enrollment number generated:", enrollmentNumber);

    const whatsappMode = process.env.WHATSAPP_API_TOKEN ? "production" : "simulation";
    console.log("📱 WhatsApp Mode determined:", {
      mode: whatsappMode,
      hasToken: !!process.env.WHATSAPP_API_TOKEN,
      hasInstanceId: !!process.env.WHATSAPP_INSTANCE_ID,
    });

    console.log("📝 Creating student record...");
    
    // ✅ إعداد بيانات WhatsApp التفاعلية
    const whatsappButtons = [
      { id: "arabic_btn", title: "العربية 🇸🇦" },
      { id: "english_btn", title: "English 🇺🇸" }
    ];
    
    const studentDataToSave = {
      ...cleanData,
      enrollmentNumber,
      metadata: {
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        
        // ✅ حقول WhatsApp المحسنة للأزرار
        whatsappWelcomeSent: false,
        whatsappInteractiveSent: false,
        whatsappButtons: whatsappButtons,
        whatsappStatus: "pending",
        whatsappMode: whatsappMode,
        whatsappMessagesCount: 0,
        whatsappTotalMessages: 0,
        
        // حقول اختيار اللغة
        whatsappLanguageSelected: false,
        whatsappLanguageSelection: null,
        whatsappButtonSelected: null,
        whatsappResponseReceived: false,
        
        // حقول التأكيد
        whatsappLanguageConfirmed: false,
        whatsappConfirmationSent: false,
        
        // المحادثة
        whatsappConversationId: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
    };

    console.log("📋 Student data to save:", {
      name: studentDataToSave.personalInfo.fullName,
      whatsappNumber: studentDataToSave.personalInfo.whatsappNumber,
      buttons: whatsappButtons.length,
      mode: whatsappMode
    });

    let savedStudent;
    try {
      const newStudent = new Student(studentDataToSave);
      savedStudent = await newStudent.save();
      
      console.log("✅ Student saved successfully:", {
        id: savedStudent._id,
        enrollmentNumber: savedStudent.enrollmentNumber,
        name: savedStudent.personalInfo.fullName,
        whatsappNumber: savedStudent.personalInfo.whatsappNumber
      });
    } catch (saveError) {
      console.error("❌ Error saving student to database:", {
        message: saveError.message,
        name: saveError.name,
        code: saveError.code,
        errors: saveError.errors,
      });
      
      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyPattern)[0];
        console.error("❌ Duplicate field error:", field);
        return NextResponse.json(
          {
            success: false,
            message: `Data already exists: ${field}`,
            field: field,
            value: saveError.keyValue[field],
          },
          { status: 409 }
        );
      }

      if (saveError.name === 'ValidationError') {
        const errors = Object.values(saveError.errors).map((err) => ({
          field: err.path,
          message: err.message,
        }));

        console.error("❌ Validation errors:", errors);

        return NextResponse.json(
          {
            success: false,
            message: "Validation failed",
            errors: errors,
          },
          { status: 400 }
        );
      }
      
      throw saveError;
    }

    console.log("📱 Triggering WhatsApp automation...");
    console.log("📊 Automation details:", {
      studentId: savedStudent._id,
      studentName: savedStudent.personalInfo.fullName,
      whatsappNumber: savedStudent.personalInfo.whatsappNumber,
      mode: whatsappMode,
      willSend: whatsappMode === "production",
      messages: "Welcome + Interactive language selection with buttons",
      totalMessages: 2,
      buttons: whatsappButtons,
      flow: [
        "Step 1: Send welcome message (Arabic + English)",
        "Step 2: Send interactive message with 2 BUTTONS",
        "Step 3: Student clicks button (arabic_btn or english_btn)",
        "Step 4: Webhook receives response and updates database",
        "Step 5: Send confirmation message in selected language"
      ]
    });

    setTimeout(async () => {
      try {
        console.log("🔄 Starting WhatsApp automation in background...");

        const { wapilotService } = await import("@/app/services/wapilot-service");

        console.log("🔧 Wapilot service loaded, mode:", wapilotService.mode);

        const whatsappResult = await wapilotService.sendWelcomeMessages(
          savedStudent.personalInfo.fullName,
          savedStudent.personalInfo.whatsappNumber
        );

        console.log("📦 WhatsApp automation result:", whatsappResult);

        if (whatsappResult.success) {
          console.log("✅ WhatsApp automation completed successfully:", {
            studentName: savedStudent.personalInfo.fullName,
            whatsappNumber: whatsappResult.whatsappNumber,
            mode: whatsappResult.mode,
            messagesSent: whatsappResult.totalMessages || 2,
            interactive: true,
            buttons: whatsappResult.buttons,
            nextStep: "Waiting for student button click"
          });

          try {
            const updateData = {
              "metadata.whatsappWelcomeSent": true,
              "metadata.whatsappInteractiveSent": true,
              "metadata.whatsappSentAt": new Date(),
              "metadata.whatsappStatus": "sent",
              "metadata.whatsappMode": whatsappResult.mode,
              "metadata.whatsappMessagesCount": whatsappResult.totalMessages || 2,
              "metadata.whatsappTotalMessages": whatsappResult.totalMessages || 2,
              "metadata.updatedAt": new Date()
            };

            if (whatsappResult.messages && whatsappResult.messages.length > 1) {
              const secondMessage = whatsappResult.messages[1];
              if (secondMessage.result && secondMessage.result.messageId) {
                updateData["metadata.whatsappMessageId"] = secondMessage.result.messageId;
              }
            }

            await Student.findByIdAndUpdate(savedStudent._id, {
              $set: updateData
            });
            
            console.log("✅ Student record updated with WhatsApp info");
          } catch (updateError) {
            console.error("❌ Error updating student record:", updateError);
          }
        } else if (whatsappResult.skipped) {
          console.log("⚠️ WhatsApp automation skipped:", whatsappResult.reason);

          try {
            await Student.findByIdAndUpdate(savedStudent._id, {
              $set: {
                "metadata.whatsappWelcomeSent": false,
                "metadata.whatsappInteractiveSent": false,
                "metadata.whatsappStatus": "skipped",
                "metadata.whatsappSkipReason": whatsappResult.reason,
                "metadata.updatedAt": new Date(),
              }
            });
          } catch (updateError) {
            console.error("❌ Error updating student record:", updateError);
          }
        } else {
          console.warn("⚠️ WhatsApp automation failed:", whatsappResult);

          try {
            await Student.findByIdAndUpdate(savedStudent._id, {
              $set: {
                "metadata.whatsappWelcomeSent": false,
                "metadata.whatsappInteractiveSent": false,
                "metadata.whatsappStatus": "failed",
                "metadata.whatsappError": whatsappResult.reason || "Unknown error",
                "metadata.updatedAt": new Date(),
              }
            });
          } catch (updateError) {
            console.error("❌ Error updating student record:", updateError);
          }
        }
      } catch (automationError) {
        console.error("❌ WhatsApp automation failed:", automationError);

        try {
          await Student.findByIdAndUpdate(savedStudent._id, {
            $set: {
              "metadata.whatsappWelcomeSent": false,
              "metadata.whatsappInteractiveSent": false,
              "metadata.whatsappStatus": "error",
              "metadata.whatsappError": automationError.message,
              "metadata.whatsappErrorAt": new Date(),
              "metadata.updatedAt": new Date()
            }
          });
        } catch (updateError) {
          console.error("❌ Error updating student record:", updateError);
        }
      }
    }, 2000);

    return NextResponse.json(
      {
        success: true,
        message: cleanData.authUserId
          ? "Student created successfully (linked to user account)"
          : "Student created successfully (without user account link)",
        data: {
          student: {
            id: savedStudent._id,
            enrollmentNumber: savedStudent.enrollmentNumber,
            fullName: savedStudent.personalInfo.fullName,
            email: savedStudent.personalInfo.email,
            status: savedStudent.enrollmentInfo.status,
            whatsappNumber: savedStudent.personalInfo.whatsappNumber,
            hasUserAccount: !!cleanData.authUserId,
            language: savedStudent.communicationPreferences.preferredLanguage,
            whatsappMode: whatsappMode,
            conversationId: savedStudent.metadata.whatsappConversationId
          },
          whatsappAutomation: {
            triggered: true,
            status: "processing",
            messages: {
              total: 2,
              sent: 0,
              pending: 2
            },
            messageFlow: [
              {
                step: 1,
                type: "welcome",
                content: "Welcome message (Arabic + English)",
                status: "pending"
              },
              {
                step: 2,
                type: "interactive_buttons",
                content: "Language selection with interactive buttons",
                buttons: whatsappButtons,
                status: "pending"
              },
              {
                step: 3,
                type: "confirmation",
                content: "Will be sent after button click",
                status: "waiting"
              }
            ],
            interactiveButtons: whatsappButtons,
            mode: whatsappMode,
            willSend: whatsappMode === "production",
            webhook: {
              url: "/api/whatsapp/webhook",
              status: "active",
              method: "POST",
              supported_responses: ["arabic_btn", "english_btn", "1", "2"],
              description: "Receives button clicks and updates language preference"
            },
            expectedResponse: {
              "arabic_btn": "Arabic (العربية)",
              "english_btn": "English (الإنجليزية)",
              "1": "Arabic (fallback)",
              "2": "English (fallback)"
            },
            notes: [
              "Student will receive two messages immediately",
              "Second message has 2 INTERACTIVE BUTTONS",
              "Student clicks button to choose language",
              "System automatically updates database",
              "Confirmation message sent in chosen language"
            ]
          }
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating student:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      errors: error.errors,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
    });

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "unknown";
      console.error("❌ Duplicate field error:", field);
      return NextResponse.json(
        {
          success: false,
          message: `البيانات موجودة مسبقاً: ${field}`,
          error: `Data already exists: ${field}`,
          field: field,
          value: error.keyValue?.[field],
        },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors || {}).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      console.error("❌ Validation errors:", errors);

      return NextResponse.json(
        {
          success: false,
          message: "فشل التحقق من البيانات",
          error: "Validation failed",
          errors: errors,
        },
        { status: 400 }
      );
    }

    // Handle CastError (invalid ObjectId, etc.)
    if (error.name === "CastError") {
      console.error("❌ Cast error:", error.path, error.value);
      return NextResponse.json(
        {
          success: false,
          message: `قيمة غير صحيحة للحقل: ${error.path}`,
          error: `Invalid value for field: ${error.path}`,
          field: error.path,
          value: error.value,
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        message: error.message || "فشل في إنشاء الطالب",
        error: error.message || "Failed to create student",
        ...(process.env.NODE_ENV === "development" && {
          stack: error.stack,
          details: {
            name: error.name,
            code: error.code,
          },
        }),
      },
      { status: 500 }
    );
  }
}

// GET: الحصول على جميع الطلاب (مع التصفية والتخطيط)
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const level = searchParams.get("level");
    const source = searchParams.get("source");
    const whatsappStatus = searchParams.get("whatsappStatus");
    const language = searchParams.get("language");
    const hasWhatsappResponse = searchParams.get("hasWhatsappResponse");

    const query = { isDeleted: false };

    if (status) query["enrollmentInfo.status"] = status;
    if (level) query["academicInfo.level"] = level;
    if (source) query["enrollmentInfo.source"] = source;
    if (whatsappStatus) query["metadata.whatsappStatus"] = whatsappStatus;
    if (language) query["communicationPreferences.preferredLanguage"] = language;
    
    if (hasWhatsappResponse === "true") {
      query["metadata.whatsappResponseReceived"] = true;
    } else if (hasWhatsappResponse === "false") {
      query["metadata.whatsappResponseReceived"] = false;
    }

    if (search) {
      query["$or"] = [
        { "personalInfo.fullName": { $regex: search, $options: "i" } },
        { "personalInfo.email": { $regex: search, $options: "i" } },
        { enrollmentNumber: { $regex: search, $options: "i" } },
        { "personalInfo.phone": { $regex: search, $options: "i" } },
        { "personalInfo.nationalId": { $regex: search, $options: "i" } },
      ];
    }

    const totalStudents = await Student.countDocuments(query);
    const totalPages = Math.ceil(totalStudents / limit);
    const skip = (page - 1) * limit;

    const students = await Student.find(query)
      .populate("authUserId", "name email role")
      .populate("metadata.createdBy", "name email")
      .populate("enrollmentInfo.referredBy", "personalInfo.fullName enrollmentNumber")
      .sort({ "metadata.createdAt": -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ✅ تنسيق البيانات مع دعم الأزرار التفاعلية
    const formattedStudents = students.map((student) => ({
      id: student._id,
      enrollmentNumber: student.enrollmentNumber,
      personalInfo: student.personalInfo,
      guardianInfo: student.guardianInfo,
      enrollmentInfo: student.enrollmentInfo,
      academicInfo: student.academicInfo,
      communicationPreferences: student.communicationPreferences,
      metadata: student.metadata,
      createdAt: student.metadata.createdAt,
      createdBy: student.metadata.createdBy,
      authUserId: student.authUserId,
      
      // ✅ حقول WhatsApp المحسنة مع الأزرار
      whatsappStatus: student.metadata?.whatsappStatus || "pending",
      whatsappInteractiveSent: student.metadata?.whatsappInteractiveSent || false,
      whatsappButtons: student.metadata?.whatsappButtons || [],
      whatsappSentAt: student.metadata?.whatsappSentAt,
      whatsappMessageId: student.metadata?.whatsappMessageId,
      whatsappMode: student.metadata?.whatsappMode || "simulation",
      whatsappLanguageSelected: student.metadata?.whatsappLanguageSelected || false,
      whatsappLanguageSelection: student.metadata?.whatsappLanguageSelection,
      whatsappButtonSelected: student.metadata?.whatsappButtonSelected,
      whatsappResponseReceived: student.metadata?.whatsappResponseReceived || false,
      whatsappResponse: student.metadata?.whatsappResponse,
      whatsappConfirmationSent: student.metadata?.whatsappConfirmationSent || false,
      whatsappMessagesCount: student.metadata?.whatsappMessagesCount || 0,
      language: student.communicationPreferences?.preferredLanguage || "ar",
      conversationId: student.metadata?.whatsappConversationId
    }));

    // ✅ إحصائيات WhatsApp المحسنة مع الأزرار
    const whatsappStats = {
      total: totalStudents,
      sent: await Student.countDocuments({
        ...query,
        "metadata.whatsappStatus": "sent",
      }),
      pending: await Student.countDocuments({
        ...query,
        "metadata.whatsappStatus": "pending",
      }),
      failed: await Student.countDocuments({
        ...query,
        "metadata.whatsappStatus": "failed",
      }),
      error: await Student.countDocuments({
        ...query,
        "metadata.whatsappStatus": "error",
      }),
      interactiveSent: await Student.countDocuments({
        ...query,
        "metadata.whatsappInteractiveSent": true,
      }),
      responseReceived: await Student.countDocuments({
        ...query,
        "metadata.whatsappResponseReceived": true,
      }),
      languageStats: {
        arabic: await Student.countDocuments({
          ...query,
          "communicationPreferences.preferredLanguage": "ar",
        }),
        english: await Student.countDocuments({
          ...query,
          "communicationPreferences.preferredLanguage": "en",
        }),
      },
      confirmationStats: {
        confirmed: await Student.countDocuments({
          ...query,
          "metadata.whatsappConfirmationSent": true,
        }),
        pendingConfirmation: await Student.countDocuments({
          ...query,
          "metadata.whatsappLanguageSelected": true,
          "metadata.whatsappConfirmationSent": false,
        }),
      },
      buttonStats: {
        arabicSelected: await Student.countDocuments({
          ...query,
          "metadata.whatsappButtonSelected": { $in: ["1", "arabic_btn"] },
        }),
        englishSelected: await Student.countDocuments({
          ...query,
          "metadata.whatsappButtonSelected": { $in: ["2", "english_btn"] },
        }),
      }
    };

    return NextResponse.json(
      {
        success: true,
        data: formattedStudents,
        whatsappStats,
        pagination: {
          page,
          limit,
          totalStudents,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch students",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// PUT, DELETE, PATCH methods remain the same...
// (باقي الدوال كما هي بدون تغيير)
// PUT: تحديث طالب
export async function PUT(req, { params }) {
  try {
    console.log(`✏️ Updating student with ID: ${params.id}`);

    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log("❌ Admin authorization failed");
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    console.log(`👤 Admin performing update: ${adminUser.email}`);

    await connectDB();

    const { id } = params;
    const updateData = await req.json();

    console.log(
      "📥 Update data received:",
      JSON.stringify(updateData, null, 2)
    );

    // التحقق من صحة معرف MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`❌ Invalid student ID format: ${id}`);
      return NextResponse.json(
        { success: false, message: "Invalid student ID format" },
        { status: 400 }
      );
    }

    // التحقق من وجود الطالب وغير محذوف
    const existingStudent = await Student.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingStudent) {
      console.log(`❌ Student not found or deleted: ${id}`);
      return NextResponse.json(
        { success: false, message: "Student not found or has been deleted" },
        { status: 404 }
      );
    }

    // تنظيف البيانات
    const cleanUpdateData = {
      ...updateData,
      // إذا كان authUserId فارغًا، ضععه null
      authUserId:
        updateData.authUserId && updateData.authUserId.trim() !== ""
          ? updateData.authUserId
          : null,
      // تنظيف referredBy
      enrollmentInfo: updateData.enrollmentInfo
        ? {
            ...updateData.enrollmentInfo,
            referredBy:
              updateData.enrollmentInfo.referredBy &&
              updateData.enrollmentInfo.referredBy.trim() !== ""
                ? updateData.enrollmentInfo.referredBy
                : null,
          }
        : undefined,
    };

    // إعداد بيانات التحديث
    const updatePayload = {
      ...cleanUpdateData,
      "metadata.lastModifiedBy": adminUser.id,
      "metadata.updatedAt": new Date(),
    };

    console.log("🔄 Executing database update...");

    // تنفيذ التحديث مع التحقق من الصحة
    const updatedStudent = await Student.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updatePayload },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    )
      .populate("metadata.lastModifiedBy", "name email")
      .populate("authUserId", "name email");

    if (!updatedStudent) {
      console.log(`❌ Student update failed for ID: ${id}`);
      return NextResponse.json(
        { success: false, message: "Failed to update student" },
        { status: 500 }
      );
    }

    console.log(
      `✅ Student updated successfully: ${updatedStudent.enrollmentNumber}`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Student updated successfully",
        data: {
          id: updatedStudent._id,
          enrollmentNumber: updatedStudent.enrollmentNumber,
          fullName: updatedStudent.personalInfo.fullName,
          updatedFields: Object.keys(cleanUpdateData),
          metadata: {
            lastModifiedBy: updatedStudent.metadata.lastModifiedBy,
            updatedAt: updatedStudent.metadata.updatedAt,
          },
        },
      },
      { status: 200 }
    );
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
          suggestion: "Use a unique value for this field",
        },
        { status: 409 }
      );
    }

    // معالجة أخطاء التحقق من صحة Mongoose
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      console.error("❌ Validation errors:", errors);

      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update student",
        error: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
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
      console.log("❌ Admin authorization failed");
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
        { success: false, message: "Invalid student ID format" },
        { status: 400 }
      );
    }

    // التحقق من أن الطالب موجود وغير محذوف مسبقاً
    const existingStudent = await Student.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingStudent) {
      console.log(`❌ Student not found or already deleted: ${id}`);
      return NextResponse.json(
        {
          success: false,
          message: "Student not found or has already been deleted",
          suggestion: "Check student status or restore from trash if needed",
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
          "enrollmentInfo.status": "Dropped",
          "metadata.lastModifiedBy": adminUser.id,
          "metadata.updatedAt": new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!deletedStudent) {
      console.log(`❌ Soft delete failed for student: ${id}`);
      return NextResponse.json(
        { success: false, message: "Failed to delete student" },
        { status: 500 }
      );
    }

    console.log(
      `✅ Student soft deleted successfully: ${deletedStudent.enrollmentNumber}`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Student deleted successfully (soft delete)",
        data: {
          id: deletedStudent._id,
          enrollmentNumber: deletedStudent.enrollmentNumber,
          fullName: deletedStudent.personalInfo.fullName,
          deletedAt: deletedStudent.deletedAt,
          status: deletedStudent.enrollmentInfo.status,
          canBeRestored: true,
          restorationNote: "Student can be restored within 30 days",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ Error deleting student ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete student",
        error: error.message,
        ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      },
      { status: 500 }
    );
  }
}

// 🔥 PATCH: إعادة إرسال رسالة WhatsApp
export async function PATCH(req, { params }) {
  try {
    console.log(`🔄 Resending WhatsApp message for student: ${params.id}`);

    // التحقق من صلاحية الأدمن
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log("❌ Admin authorization failed");
      return authCheck.response;
    }

    await connectDB();

    const { id } = params;

    // التحقق من صحة معرف MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID format" },
        { status: 400 }
      );
    }

    // التحقق من وجود الطالب
    const student = await Student.findOne({ _id: id, isDeleted: false });
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // تحديث حالة الطالب إلى قيد المعالجة
    await Student.findByIdAndUpdate(id, {
      $set: {
        "metadata.whatsappStatus": "pending",
        "metadata.whatsappError": null,
        "metadata.updatedAt": new Date(),
      },
    });

    // 🔥 تشغيل WhatsApp automation في الخلفية
    setTimeout(async () => {
      try {
        console.log("🔄 Starting WhatsApp resend in background...");

        const { wapilotService } = await import(
          "@/app/services/wapilot-service"
        );
        const whatsappResult = await wapilotService.sendWelcomeMessages(
          student.personalInfo.fullName,
          student.personalInfo.whatsappNumber
        );

        if (whatsappResult.success) {
          console.log("✅ WhatsApp message resent successfully");

          await Student.findByIdAndUpdate(id, {
            $set: {
              "metadata.whatsappWelcomeSent": true,
              "metadata.whatsappSentAt": new Date(),
              "metadata.whatsappMessageId": whatsappResult.messages?.[1]?.result?.messageId,
              "metadata.whatsappStatus": "sent",
              "metadata.whatsappMode": whatsappResult.mode,
              "metadata.whatsappMessagesCount": whatsappResult.totalMessages || 2,
              "metadata.updatedAt": new Date(),
            }
          });
        } else {
          console.warn("⚠️ WhatsApp resend failed:", whatsappResult);

          await Student.findByIdAndUpdate(id, {
            $set: {
              "metadata.whatsappStatus": "failed",
              "metadata.whatsappError":
                whatsappResult.reason || "Unknown error",
              "metadata.updatedAt": new Date(),
            }
          });
        }
      } catch (error) {
        console.error("❌ WhatsApp resend error:", error);

        await Student.findByIdAndUpdate(id, {
          $set: {
            "metadata.whatsappStatus": "error",
            "metadata.whatsappError": error.message,
            "metadata.whatsappErrorAt": new Date(),
            "metadata.updatedAt": new Date(),
          }
        });
      }
    }, 1000);

    return NextResponse.json({
      success: true,
      message: "WhatsApp message resend triggered successfully",
      data: {
        studentId: student._id,
        studentName: student.personalInfo.fullName,
        whatsappNumber: student.personalInfo.whatsappNumber,
        status: "resending",
        estimatedTime: "5-10 seconds",
        messages: "Welcome + Language selection (2 messages)",
        note: "Confirmation message will be sent when student responds with 1 or 2"
      }
    });
  } catch (error) {
    console.error("❌ Error resending WhatsApp:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to resend WhatsApp message",
        error: error.message,
      },
      { status: 500 }
    );
  }
}