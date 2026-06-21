// app/api/allStudents/updateUser/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "../../../models/User";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── PUT /api/allStudents/updateUser ───────────────────────────────────────────
// بتعدل إيميل و/أو باسورد اليوزر المرتبط بطالب موجود بالفعل.
// الحقلين اختياريين — لو مش متبعتين (أو فاضيين) مايتغيّروش.
export async function PUT(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const body = await req.json();
    const { userId, email, password } = body;

    // ── Validate userId ────────────────────────────────────────────────────
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid or missing userId" },
        { status: 400 }
      );
    }

    const trimmedEmail    = typeof email    === "string" ? email.trim()    : "";
    const trimmedPassword = typeof password === "string" ? password.trim() : "";

    // ── Nothing to update ──────────────────────────────────────────────────
    if (!trimmedEmail && !trimmedPassword) {
      return NextResponse.json(
        { success: false, message: "Nothing to update — provide email and/or password" },
        { status: 400 }
      );
    }

    const existingUser = await User.findById(userId).select("_id email");
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const updates = {};
    const errors  = {};

    // ── Email ───────────────────────────────────────────────────────────────
    if (trimmedEmail) {
      const normalizedEmail = trimmedEmail.toLowerCase();

      if (!emailRegex.test(normalizedEmail)) {
        errors.email = "A valid email is required";
      } else if (normalizedEmail !== existingUser.email) {
        // فحص إن الإيميل مش مستخدم من يوزر تاني
        const emailTaken = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: userId },
        }).select("_id").lean();

        if (emailTaken) {
          errors.email = "This email is already registered to another user";
        } else {
          updates.email = normalizedEmail;
        }
      }
      // لو نفس الإيميل الحالي، مفيش حاجة تتغير ومفيش error
    }

    // ── Password ────────────────────────────────────────────────────────────
    if (trimmedPassword) {
      if (trimmedPassword.length < 6) {
        errors.password = "Password must be at least 6 characters";
      } else {
        updates.password = await bcrypt.hash(trimmedPassword, 10);
      }
    }

    if (Object.keys(errors).length) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      // يعني الإيميل المبعوت كان نفس الإيميل الحالي والباسورد فاضي
      return NextResponse.json(
        { success: true, message: "No changes detected", changed: [] },
        { status: 200 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("name email username role");

    return NextResponse.json(
      {
        success: true,
        message: "User updated successfully",
        changed: Object.keys(updates),
        data: {
          id:    updatedUser._id,
          name:  updatedUser.name,
          email: updatedUser.email,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ PUT /api/allStudents/updateUser:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Email is already registered", errors: { email: "Email is already registered" } },
        { status: 409 }
      );
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map(e => ({ field: e.path, message: e.message }));
      return NextResponse.json(
        { success: false, message: "Validation failed", errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update user", error: error.message },
      { status: 500 }
    );
  }
}