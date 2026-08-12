// src/app/api/guest/messages/[id]/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../../models/Portfolio";
import ContactMessage from "../../../../models/ContactMessage";
import { requireAuth } from "@/utils/authMiddleware";

export async function DELETE(req, { params }) {
  try {
    const authCheck = await requireAuth(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid message ID" },
        { status: 400 }
      );
    }

    const currentUser = authCheck.user;
    const userId = currentUser?.id || currentUser?._id;

    const portfolio = await Portfolio.findOne({ userId }).select("_id").lean();
    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: "Portfolio not found" },
        { status: 404 }
      );
    }

    // Only delete if the message actually belongs to this user's portfolio
    const deleted = await ContactMessage.findOneAndDelete({
      _id: id,
      portfolioId: portfolio._id,
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Message not found" },
        { status: 404 }
      );
    }

    await Portfolio.findByIdAndUpdate(portfolio._id, { $inc: { messagesCount: -1 } });

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully",
      data: { messageId: id },
    });
  } catch (error) {
    console.error("❌ Delete message error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete message", error: error.message },
      { status: 500 }
    );
  }
}