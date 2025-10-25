// app/api/auth/profile/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../../models/User";
import { connectDB } from "../../../../lib/mongodb";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET;

export async function PATCH(req: Request) {
  try {
    if (!JWT_SECRET) {
      console.error("JWT secret not set");
      return NextResponse.json(
        { success: false, message: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Missing token" },
        { status: 401 }
      );
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("JWT verify error:", err);
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, password, image } = body ?? {};

    await connectDB();

    const userId = payload?.id || payload?._id;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token payload" },
        { status: 401 }
      );
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json(
          { success: false, message: "Name must be at least 2 characters" },
          { status: 400 }
        );
      }
      user.name = name.trim();
    }

    if (password !== undefined && password !== "") {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      user.password = await bcrypt.hash(password, 10);
    }

    if (image !== undefined && image !== null && image !== "") {
      if (typeof image !== "string") {
        return NextResponse.json(
          { success: false, message: "Invalid image data" },
          { status: 400 }
        );
      }

      
      const parts = image.split(",");
      const meta = parts[0] || "";
      const base64 = parts[1] || parts[0];
      const mimeTypeMatch = meta.match(/data:([^;]+);base64/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : null;

      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!mimeType || !validTypes.includes(mimeType)) {
        return NextResponse.json(
          { success: false, message: "Image must be JPG, PNG, or WEBP" },
          { status: 400 }
        );
      }

  
      let imageSize = 0;
      try {
        const buffer = Buffer.from(base64, "base64");
        imageSize = buffer.length;
      } catch (e) {
        console.warn("Could not decode base64 image for size check", e);
        return NextResponse.json(
          { success: false, message: "Invalid image data" },
          { status: 400 }
        );
      }

      const maxSize = 2 * 1024 * 1024; 
      if (imageSize > maxSize) {
        return NextResponse.json(
          { success: false, message: "Image size must be less than 2MB" },
          { status: 400 }
        );
      }

      user.image = image;
    }

    await user.save();

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image || null,
    };

    return NextResponse.json(
      { success: true, message: "Profile updated", user: userResponse },
      { status: 200 }
    );
  } catch (err) {
    console.error("Update profile error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
