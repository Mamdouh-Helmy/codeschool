import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import Subscription from "../../models/Subscription";
import User from "../../models/User";
import PricingPlan from "../../models/PricingPlan";
import { verifyJwt } from "@/lib/auth";


export async function GET(request: Request) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 }
      );
    }

    const user = verifyJwt(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "توكن غير صالح" },
        { status: 401 }
      );
    }

    // التحقق إذا كان المستخدم مسؤولاً
    const userDoc = await User.findById(user.id);
    const isAdmin = userDoc?.role === "admin";

    let subscriptions;

    if (isAdmin) {
      // إذا كان مسؤولاً، جلب جميع الاشتراكات
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");

      if (userId) {
        // جلب اشتراكات مستخدم محدد
        subscriptions = await Subscription.find({ user: userId })
          .populate("user", "name email phone")
          .populate("plan", "name price duration features")
          .sort({ createdAt: -1 });
      } else {
        // جلب جميع الاشتراكات
        subscriptions = await Subscription.find({})
          .populate("user", "name email phone")
          .populate("plan", "name price duration features")
          .sort({ createdAt: -1 });
      }
    } else {
      // إذا كان مستخدم عادي، جلب اشتراكاته فقط
      subscriptions = await Subscription.find({ user: user.id })
        .populate("plan", "name price duration features")
        .sort({ createdAt: -1 });
    }

    return NextResponse.json({
      success: true,
      data: subscriptions,
      isAdmin: isAdmin,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { success: false, message: "خطأ في الخادم" },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 }
      );
    }

    const user = verifyJwt(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "توكن غير صالح" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { planId, paymentMethod = "manual", studentCount = 1 } = body;

    if (!planId) {
      return NextResponse.json(
        { success: false, message: "معرف الخطة مطلوب" },
        { status: 400 }
      );
    }

  
    const plan = await PricingPlan.findById(planId);
    if (!plan) {
      return NextResponse.json(
        { success: false, message: "الخطة غير موجودة" },
        { status: 404 }
      );
    }

  
    const currency = plan.currency || "USD";
    const totalAmount = plan.price || 0;

  
    const subscription = new Subscription({
      user: user.id,
      plan: planId,
      status: "active",
      paymentStatus: "pending",
      paymentMethod,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
      studentCount,
      totalAmount: totalAmount,
      currency: currency, 
      invoiceNumber: `INV-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`,
    });

    await subscription.save();

   
    const populatedSubscription = await Subscription.findById(subscription._id)
      .populate("user", "name email phone")
      .populate("plan", "name price duration features currency"); 

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الاشتراك بنجاح",
      data: populatedSubscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { success: false, message: "خطأ في الخادم" },
      { status: 500 }
    );
  }
}


export async function PUT(req: Request) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 }
      );
    }

    const user = verifyJwt(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "توكن غير صالح" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      subscriptionId,
      status,
      paymentStatus,
      paymentMethod,
      studentCount,
      notes,
    } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, message: "معرف الاشتراك مطلوب" },
        { status: 400 }
      );
    }

 
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return NextResponse.json(
        { success: false, message: "الاشتراك غير موجود" },
        { status: 404 }
      );
    }

  
    const userDoc = await User.findById(user.id);
    const isAdmin = userDoc?.role === "admin";

    if (!isAdmin && subscription.user.toString() !== user.id) {
      return NextResponse.json(
        { success: false, message: "غير مصرح لتعديل هذا الاشتراك" },
        { status: 403 }
      );
    }

  
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (studentCount !== undefined) updateData.studentCount = studentCount;
    if (notes !== undefined) updateData.notes = notes;

  
    if (status === "active" && subscription.status !== "active") {
      updateData.startDate = new Date();
      updateData.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      updateData,
      { new: true }
    )
      .populate("user", "name email phone")
      .populate("plan", "name price duration features");

    return NextResponse.json({
      success: true,
      message: "تم تحديث الاشتراك بنجاح",
      data: updatedSubscription,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { success: false, message: "خطأ في الخادم" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 }
      );
    }

    const user = verifyJwt(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "توكن غير صالح" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("id");

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, message: "معرف الاشتراك مطلوب" },
        { status: 400 }
      );
    }

   
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return NextResponse.json(
        { success: false, message: "الاشتراك غير موجود" },
        { status: 404 }
      );
    }

   
    const userDoc = await User.findById(user.id);
    const isAdmin = userDoc?.role === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "غير مصرح لحذف الاشتراكات" },
        { status: 403 }
      );
    }

   
    await Subscription.findByIdAndDelete(subscriptionId);

    return NextResponse.json({
      success: true,
      message: "تم حذف الاشتراك بنجاح",
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { success: false, message: "خطأ في الخادم" },
      { status: 500 }
    );
  }
}
