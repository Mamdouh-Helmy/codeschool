import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../../models/Student";
import PackagePlan from "../../../../models/PackagePlan";
import { createInvoiceForPackage } from "@/lib/billing";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    console.log("📦 Starting credit package addition...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      console.log("❌ Admin authorization failed");
      return authCheck.response;
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const {
      packagePlanId,
      price, // اختياري — لو مبعتش، بناخد سعر الباقة الافتراضي
      startDate,
      paymentOption, // "full" | "none" | "partial"
      amountPaid = 0, // مطلوب لو paymentOption = "partial"
      dueDate, // مطلوب لو paymentOption != "full"
    } = body;

    if (!packagePlanId || !mongoose.Types.ObjectId.isValid(packagePlanId)) {
      return NextResponse.json(
        { success: false, message: "packagePlanId is required and must be valid" },
        { status: 400 },
      );
    }

    if (!["full", "none", "partial"].includes(paymentOption)) {
      return NextResponse.json(
        { success: false, message: "paymentOption must be 'full', 'none', or 'partial'" },
        { status: 400 },
      );
    }

    if (paymentOption !== "full" && !dueDate) {
      return NextResponse.json(
        { success: false, message: "dueDate is required unless paymentOption is 'full'" },
        { status: 400 },
      );
    }

    await connectDB();

    const [student, plan] = await Promise.all([
      Student.findOne({ _id: id, isDeleted: false }),
      PackagePlan.findOne({ _id: packagePlanId, isActive: true }),
    ]);

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 },
      );
    }

    if (!plan) {
      return NextResponse.json(
        { success: false, message: "Package plan not found or inactive" },
        { status: 404 },
      );
    }

    const finalPrice = price !== undefined && price !== null ? Number(price) : plan.price;

    if (paymentOption === "partial") {
      const paidNum = Number(amountPaid) || 0;
      if (paidNum <= 0 || paidNum >= finalPrice) {
        return NextResponse.json(
          {
            success: false,
            message: "Partial payment amount must be greater than 0 and less than the price",
          },
          { status: 400 },
        );
      }
    }

    // ✅ منطق الساعات — من غير أي شرط دفع، الطالب بياخد الساعات كاملة فورًا
    const result = await student.addCreditPackage({
      packagePlanId,
      price: finalPrice,
      startDate,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 },
      );
    }

    // ✅ إنشاء الفاتورة المرتبطة — منفصلة تمامًا عن منح الساعات
    let invoice;
    try {
      invoice = await createInvoiceForPackage({
        studentId: id,
        packageId: student.creditSystem.currentPackage._id,
        groupId: student.academicInfo?.groupIds?.[0] || null,
        totalAmount: finalPrice,
        paymentOption,
        amountPaidNow: paymentOption === "partial" ? Number(amountPaid) : 0,
        dueDate: paymentOption === "full" ? null : dueDate,
        createdBy: authCheck.user.id,
      });
    } catch (invoiceError) {
      // ✅ الساعات اتضافت بالفعل — الفاتورة فشلت. منرجعش الساعات تلقائيًا
      // لتجنب race conditions، بس نبلغ الأدمن بوضوح إن الفاتورة محتاجة متابعة يدوية
      console.error("❌ Package hours granted but invoice creation failed:", invoiceError);
      return NextResponse.json(
        {
          success: false,
          message: `تم منح الساعات للطالب لكن فشل إنشاء الفاتورة: ${invoiceError.message}. راجع الفاتورة يدويًا.`,
        },
        { status: 500 },
      );
    }

    const updatedStudent = await Student.findById(id).lean();

    const formattedStudent = {
      _id: updatedStudent._id,
      id: updatedStudent._id,
      enrollmentNumber: updatedStudent.enrollmentNumber,
      personalInfo: updatedStudent.personalInfo,
      guardianInfo: updatedStudent.guardianInfo,
      creditSystem: updatedStudent.creditSystem || {
        currentPackage: null,
        packagesHistory: [],
        exceptions: [],
        usageHistory: [],
        stats: {
          totalHoursPurchased: 0,
          totalHoursUsed: 0,
          totalHoursRemaining: 0,
          totalSessionsAttended: 0,
          totalExceptions: 0,
          activeExceptions: 0,
        },
        status: "no_package",
      },
    };

    return NextResponse.json({
      success: true,
      data: result.data,
      student: formattedStudent,
      invoice,
      message: "Package and invoice created successfully",
    });
  } catch (error) {
    console.error("❌ Error adding credit package:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// ✅ NEW — PATCH: تعديل بيانات الباكدج الحالي (تصحيح غلطة أدمن) من غير ما
// يترحّل للهيستوري ومن غير ما ينشئ فاتورة جديدة. الفاتورة الحالية (لو موجودة)
// مش بتتلمس تلقائيًا حتى لو السعر اتغيّر — العملية دي منفصلة عمدًا عن الفوترة
// (زي ما DELETE منفصل عن /api/invoices/[id]/refund) عشان منكسرش أي دفعات
// أو حسابات إسكرو اتسجلت بالفعل على الفاتورة القديمة.
export async function PATCH(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { packagePlanId, totalHours, months, price, startDate, endDate, reason } = body;

    if (packagePlanId && !mongoose.Types.ObjectId.isValid(packagePlanId)) {
      return NextResponse.json(
        { success: false, message: "Invalid packagePlanId" },
        { status: 400 },
      );
    }

    if (totalHours !== undefined && totalHours !== null) {
      const hoursNum = Number(totalHours);
      if (!Number.isFinite(hoursNum) || hoursNum < 0) {
        return NextResponse.json(
          { success: false, message: "totalHours must be a non-negative number" },
          { status: 400 },
        );
      }
    }

    if (price !== undefined && price !== null) {
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return NextResponse.json(
          { success: false, message: "price must be a non-negative number" },
          { status: 400 },
        );
      }
    }

    await connectDB();

    const student = await Student.findOne({ _id: id, isDeleted: false });
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 },
      );
    }

    if (!student.creditSystem?.currentPackage) {
      return NextResponse.json(
        {
          success: false,
          message: "Student has no active package to edit",
          code: "NO_ACTIVE_PACKAGE",
        },
        { status: 400 },
      );
    }

    const result = await student.editCreditPackage({
      packagePlanId,
      totalHours,
      months,
      price,
      startDate,
      endDate,
      reason: (reason || "").trim(),
      editedBy: authCheck.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to edit package" },
        { status: 400 },
      );
    }

    const updatedStudent = await Student.findById(id).lean();

    const formattedStudent = {
      _id: updatedStudent._id,
      id: updatedStudent._id,
      enrollmentNumber: updatedStudent.enrollmentNumber,
      personalInfo: updatedStudent.personalInfo,
      guardianInfo: updatedStudent.guardianInfo,
      creditSystem: updatedStudent.creditSystem,
      metadata: updatedStudent.metadata,
    };

    return NextResponse.json({
      success: true,
      message: "Package updated successfully",
      priceChanged: result.priceChanged,
      remainingHours: result.remainingHours,
      student: formattedStudent,
    });
  } catch (error) {
    console.error("❌ Error editing credit package:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to edit credit package" },
      { status: 500 },
    );
  }
}

// ✅ DELETE — زي ما هو تمامًا من غير أي تعديل (الفاتورة مش بتتلغى هنا عمدًا؛
// الإلغاء المالي بيتم عبر /api/invoices/[id]/refund بشكل مستقل)
export async function DELETE(req, { params }) {
  try {
    console.log("🗑️ Deleting credit package...");

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid student ID" },
        { status: 400 },
      );
    }

    await connectDB();

    const student = await Student.findOne({ _id: id, isDeleted: false });

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 },
      );
    }

    if (student.creditSystem?.currentPackage) {
      if (!student.creditSystem.packagesHistory) {
        student.creditSystem.packagesHistory = [];
      }

      student.creditSystem.packagesHistory.push({
        ...student.creditSystem.currentPackage.toObject(),
        deletedAt: new Date(),
      });

      student.creditSystem.currentPackage = null;
      student.creditSystem.status = "no_package";

      if (student.creditSystem.stats) {
        student.creditSystem.stats.totalHoursRemaining = 0;
      }

      await student.save();

      const updatedStudent = await Student.findById(id).lean();

      return NextResponse.json({
        success: true,
        message: "Package deleted successfully",
        student: {
          _id: updatedStudent._id,
          creditSystem: updatedStudent.creditSystem,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "No active package found" },
      { status: 404 },
    );
  } catch (error) {
    console.error("❌ Error deleting credit package:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}