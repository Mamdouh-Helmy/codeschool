// app/api/users/me/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/app/models/User";
import { getUserFromRequest } from "@/lib/auth";
import { resolveAvatar } from "@/lib/avatar";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  try {
    const authUser = await getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: NO_STORE },
      );
    }

    await connectDB();

    // notificationHistory ممكن تكبر جدًا — لو صفحة محتاجاها شيلها من الـ select
    const user: any = await User.findById(authUser.id)
      .select("-password -__v -notificationHistory")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404, headers: NO_STORE },
      );
    }

    const { _id, ...rest } = user;

    return NextResponse.json(
      {
        success: true,
        user: {
          ...rest,
          _id: String(_id),
          id: String(_id), // الـ CurrentUser type والـ context بيقروا id
          image: resolveAvatar(user.image),
          qrCode: user.qrCode || null,
          qrCodeData: user.qrCodeData || null,
        },
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    console.error("Get current user error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500, headers: NO_STORE },
    );
  }
}