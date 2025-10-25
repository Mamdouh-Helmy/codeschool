import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/app/models/User";

export async function GET() {
  try {
    await connectDB();
    const token = cookies().get("token")?.value;
    const user = verifyJwt(token || "");

    if (!user) {
      return NextResponse.json({ success: false, loggedIn: false }, { status: 200 });
    }

    const dbUser = await User.findById(user.id).select("-password").lean();

    if (!dbUser) {
      return NextResponse.json({ success: false, loggedIn: false }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      loggedIn: true,
      user: dbUser,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ success: false, loggedIn: false }, { status: 200 });
  }
}
