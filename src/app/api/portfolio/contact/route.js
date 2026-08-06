// app/api/portfolio/contact/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Portfolio from "../../../models/Portfolio";
import ContactMessage from "../../../models/ContactMessage";
import { connectDB } from "@/lib/mongodb";
import nodemailer from "nodemailer";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SERVICES = ["web", "uiux", "logo", "seo", ""];

// ---------- Mail transporter ----------
function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("⚠️ Email credentials not configured");
    return null;
  }

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

async function sendEmail(transporter, options) {
  try {
    const info = await transporter.sendMail(options);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("📧 Email sending error:", error);
    return { success: false, error: error.message };
  }
}

// ---------- Validation ----------
function validatePayload(body) {
  const errors = [];
  const { portfolioId, senderInfo, message } = body || {};

  if (!portfolioId || !mongoose.Types.ObjectId.isValid(portfolioId)) {
    errors.push("Invalid portfolio ID");
  }

  if (!senderInfo?.firstName?.trim()) errors.push("First name is required");
  if (!senderInfo?.lastName?.trim()) errors.push("Last name is required");

  if (!senderInfo?.email?.trim() || !EMAIL_REGEX.test(senderInfo.email.trim())) {
    errors.push("Valid email is required");
  }

  if (!senderInfo?.phoneNumber?.trim()) errors.push("Phone number is required");

  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  if (!trimmedMessage || trimmedMessage.length < 10) {
    errors.push("Message should be at least 10 characters");
  }
  if (trimmedMessage.length > 2000) {
    errors.push("Message is too long (max 2000 characters)");
  }

  return errors;
}

// ---------- Email templates ----------
function buildOwnerEmail({ user, contactMessage, service }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Portfolio App";

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f7fa;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0;">
        <h1 style="margin:0;">📩 New Message from Your Portfolio</h1>
        <p style="margin:8px 0 0;">You have received a new message via your portfolio contact form</p>
      </div>
      <div style="background:#fff;padding:30px;border-radius:0 0 10px 10px;border:1px solid #e0e0e0;">
        <div style="background:#f5f5f5;padding:20px;border-radius:6px;margin-bottom:20px;border:1px solid #e0e0e0;">
          <h3 style="margin-top:0;color:#667eea;">Sender Information</h3>
          <p><strong>Name:</strong> ${contactMessage.senderInfo.firstName} ${contactMessage.senderInfo.lastName}</p>
          <p><strong>Email:</strong> <a href="mailto:${contactMessage.senderInfo.email}">${contactMessage.senderInfo.email}</a></p>
          <p><strong>Phone:</strong> <a href="tel:${contactMessage.senderInfo.phoneNumber}">${contactMessage.senderInfo.phoneNumber}</a></p>
          ${service ? `<p><strong>Service:</strong> ${service}</p>` : ""}
          <p><strong>Date:</strong> ${new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <h3 style="color:#667eea;">Message</h3>
        <div style="background:#f8f9fa;padding:20px;border-radius:8px;border-left:4px solid #667eea;white-space:pre-wrap;">${contactMessage.message}</div>
        <div style="text-align:center;margin-top:30px;">
          <a href="${appUrl}/dashboard/messages" style="display:inline-block;background:#667eea;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:5px;">📋 View All Messages</a>
          <a href="mailto:${contactMessage.senderInfo.email}?subject=Re: Your message to ${user.name}" style="display:inline-block;background:#48bb78;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:5px;">📧 Reply</a>
        </div>
      </div>
      <p style="text-align:center;color:#666;font-size:12px;margin-top:20px;">Sent automatically from ${appName}</p>
    </body>
    </html>
  `;
}

function buildConfirmationEmail({ user, portfolio, contactMessage }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Portfolio App";
  const preview =
    contactMessage.message.length > 150
      ? `${contactMessage.message.substring(0, 150)}...`
      : contactMessage.message;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f5f7fa;">
      <div style="background:linear-gradient(135deg,#4299e1 0%,#667eea 100%);color:#fff;padding:30px;text-align:center;border-radius:10px 10px 0 0;">
        <h1 style="margin:0;">✅ Message Sent Successfully</h1>
      </div>
      <div style="background:#fff;padding:30px;border-radius:0 0 10px 10px;border:1px solid #e0e0e0;">
        <p>Hi ${contactMessage.senderInfo.firstName},</p>
        <p>Thank you for contacting <strong>${user.name}</strong>. Your message has been sent successfully and ${user.name} will get back to you soon.</p>
        <div style="background:#f8f9fa;padding:15px;border-radius:6px;border-left:4px solid #4299e1;margin:20px 0;font-style:italic;color:#555;">"${preview}"</div>
        <div style="background:#f5f5f5;padding:15px;border-radius:6px;">
          <h3 style="color:#4299e1;margin-top:0;">Contact Information</h3>
          <p><strong>Name:</strong> ${user.name}</p>
          ${user.profile?.company ? `<p><strong>Company:</strong> ${user.profile.company}</p>` : ""}
          ${portfolio.contactInfo?.email ? `<p><strong>Email:</strong> ${portfolio.contactInfo.email}</p>` : ""}
          ${portfolio.contactInfo?.phone ? `<p><strong>Phone:</strong> ${portfolio.contactInfo.phone}</p>` : ""}
          ${portfolio.contactInfo?.location ? `<p><strong>Location:</strong> ${portfolio.contactInfo.location}</p>` : ""}
        </div>
        <p style="margin-top:20px;font-style:italic;color:#666;">This is an automatic confirmation email. Please do not reply directly.</p>
        <p>Best regards,<br><strong>The ${appName} Team</strong></p>
      </div>
    </body>
    </html>
  `;
}

// ---------- Route handler ----------
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { portfolioId, senderInfo, message, service } = body;

    const errors = validatePayload(body);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: "Invalid data", errors },
        { status: 400 }
      );
    }

    const safeService = VALID_SERVICES.includes(service) ? service : "";

    const portfolio = await Portfolio.findById(portfolioId).populate(
      "userId",
      "name email contactEmail profile"
    );

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: "Portfolio not found" },
        { status: 404 }
      );
    }

    if (!portfolio.isPublished) {
      return NextResponse.json(
        { success: false, message: "Portfolio is not published" },
        { status: 400 }
      );
    }

    const user = portfolio.userId;

    const contactMessage = await ContactMessage.create({
      portfolioId,
      senderInfo: {
        firstName: senderInfo.firstName.trim(),
        lastName: senderInfo.lastName.trim(),
        email: senderInfo.email.toLowerCase().trim(),
        phoneNumber: senderInfo.phoneNumber.trim(),
      },
      service: safeService,
      message: message.trim(),
      ipAddress: req.headers.get("x-forwarded-for") || "Unknown",
      userAgent: req.headers.get("user-agent") || "Unknown",
      referrer: req.headers.get("referer") || "Direct",
    });

    let emailSent = false;
    let confirmationSent = false;
    const transporter = createTransporter();

    if (transporter) {
      const recipientEmail = user?.contactEmail || user?.email;

      if (recipientEmail) {
        const result = await sendEmail(transporter, {
          from: `"${process.env.EMAIL_FROM_NAME || "Portfolio App"}" <${process.env.EMAIL_USER}>`,
          to: recipientEmail,
          subject: `📩 New message from ${contactMessage.senderInfo.firstName} via your portfolio`,
          html: buildOwnerEmail({ user, contactMessage, service: safeService }),
          replyTo: contactMessage.senderInfo.email,
        });
        emailSent = result.success;
      }

      const confirmationResult = await sendEmail(transporter, {
        from: `"${process.env.EMAIL_FROM_NAME || "Portfolio App"}" <${process.env.EMAIL_USER}>`,
        to: contactMessage.senderInfo.email,
        subject: `✅ Message sent to ${user?.name || "the owner"} confirmed`,
        html: buildConfirmationEmail({ user, portfolio, contactMessage }),
      });
      confirmationSent = confirmationResult.success;
    }

    await Portfolio.findByIdAndUpdate(portfolioId, { $inc: { messagesCount: 1 } });

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
      data: { messageId: contactMessage._id, emailSent, confirmationSent },
    });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred while sending the message", error: error.message },
      { status: 500 }
    );
  }
}