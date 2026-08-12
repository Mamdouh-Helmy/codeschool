// src/app/api/guest/messages/[id]/reply/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../../../models/Portfolio";
import ContactMessage from "../../../../../models/ContactMessage";
import { requireAuth } from "@/utils/authMiddleware";
import nodemailer from "nodemailer";
import { getLogoAttachment, buildReplyEmail } from "@/lib/emailTemplates";

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

export async function POST(req, { params }) {
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

    const body = await req.json();
    const replyMessage = (body?.replyMessage || "").trim();
    const locale = body?.locale === "ar" ? "ar" : "en";

    if (!replyMessage) {
      return NextResponse.json(
        { success: false, message: "Reply message is required" },
        { status: 400 }
      );
    }

    const currentUser = authCheck.user;
    const userId = currentUser?.id || currentUser?._id;

    const portfolio = await Portfolio.findOne({ userId }).select("_id userId").lean();
    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: "Portfolio not found" },
        { status: 404 }
      );
    }

    const contactMessage = await ContactMessage.findOne({
      _id: id,
      portfolioId: portfolio._id,
    });

    if (!contactMessage) {
      return NextResponse.json(
        { success: false, message: "Message not found" },
        { status: 404 }
      );
    }

    const transporter = createTransporter();
    if (!transporter) {
      return NextResponse.json(
        { success: false, message: "Email service not configured" },
        { status: 500 }
      );
    }

    const senderName = `${contactMessage.senderInfo.firstName} ${contactMessage.senderInfo.lastName}`;
    const ownerName = currentUser?.name || "Portfolio Owner";

    const logoAttachment = await getLogoAttachment();
    const hasLogo = Boolean(logoAttachment);

    const subject =
      locale === "ar" ? `💬 رد جديد من ${ownerName}` : `💬 New reply from ${ownerName}`;

    const html = buildReplyEmail({
      ownerName,
      senderName,
      replyMessage,
      locale,
      hasLogo,
    });

    const info = await transporter.sendMail({
      from: `"${ownerName}" <${process.env.EMAIL_USER}>`,
      to: contactMessage.senderInfo.email,
      replyTo: currentUser?.email || process.env.EMAIL_USER,
      subject,
      html,
      attachments: logoAttachment ? [logoAttachment] : [],
    });

    contactMessage.replied = true;
    await contactMessage.save();

    return NextResponse.json({
      success: true,
      message: "Reply sent successfully",
      data: { messageId: info.messageId },
    });
  } catch (error) {
    console.error("❌ Reply error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send reply", error: error.message },
      { status: 500 }
    );
  }
}