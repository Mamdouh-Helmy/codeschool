// app/api/portfolio/contact/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Portfolio from "../../../models/Portfolio";
import ContactMessage from "../../../models/ContactMessage";
import { connectDB } from "@/lib/mongodb";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

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

async function sendEmail(transporter, options, label = "email") {
  try {
    const info = await transporter.sendMail(options);
    console.log(`📧 [${label}] sent successfully ->`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // بنطبع الخطأ كامل هنا عشان تعرف بالظبط السبب من الـ server logs
    console.error(`📧 [${label}] FAILED to send:`, error.message);
    return { success: false, error: error.message };
  }
}

// ---------- Logo attachment (embedded via CID) ----------
// Cached in memory so we don't re-read/re-fetch it on every request.
let cachedLogoBuffer = null;

async function getLogoAttachment() {
  if (cachedLogoBuffer) {
    return { filename: "logo.png", content: cachedLogoBuffer, cid: "portfolio-logo" };
  }

  // 1) Try local filesystem first (works on traditional / self-hosted Node servers,
  //    and locally in dev). On serverless platforms (e.g. Vercel) the `public/`
  //    folder is often NOT included in the function bundle, so this can fail silently.
  try {
    const logoPath = path.join(process.cwd(), "public/images/logo/logo.png");
    if (fs.existsSync(logoPath)) {
      cachedLogoBuffer = fs.readFileSync(logoPath);
      return {
        filename: "logo.png",
        content: cachedLogoBuffer,
        cid: "portfolio-logo",
        contentType: "image/png",
        contentDisposition: "inline",
      };
    }
    console.warn("⚠️ Logo not found on local filesystem at:", logoPath);
  } catch (error) {
    console.warn("⚠️ Filesystem read for logo failed:", error.message);
  }

  // 2) Fallback: fetch the logo over HTTP from the public app URL. This works
  //    regardless of runtime/hosting, as long as NEXT_PUBLIC_APP_URL is a real,
  //    publicly reachable domain (not localhost).
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl || appUrl.includes("localhost")) {
      console.warn("⚠️ Skipping logo fetch fallback: NEXT_PUBLIC_APP_URL is missing or local:", appUrl);
      return null;
    }
    const res = await fetch(`${appUrl}/images/logo/logo.png`);
    if (!res.ok) {
      console.warn("⚠️ Logo fetch fallback failed with status:", res.status);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    cachedLogoBuffer = Buffer.from(arrayBuffer);
    return {
      filename: "logo.png",
      content: cachedLogoBuffer,
      cid: "portfolio-logo",
      contentType: "image/png",
      contentDisposition: "inline",
    };
  } catch (error) {
    console.warn("⚠️ Logo fetch fallback errored:", error.message);
    return null;
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

// ---------- Brand tokens (matched to tailwind.config.js) ----------
const BRAND = {
  primary: "#ff6700",
  secondary: "#004d59",
  ink: "#1f2d30",
  muted: "#6b7c80",
  faint: "#98a5a8",
  bg: "#f4f6f7",
  card: "#ffffff",
  border: "#e8ecec",
  softBg: "#f8fafa",
};

function emailShell({ headerIcon, headerTitle, headerSubtitle, bodyHtml, accent, hasLogo }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Portfolio App";
  const accentColor = accent || BRAND.primary;

  const logoBlock = hasLogo
    ? `<img src="cid:portfolio-logo" alt="${appName}" width="120" height="30" style="height:30px;width:auto;display:block;border:0;outline:none;" />`
    : `<span style="font-size:16px;font-weight:700;color:${BRAND.secondary};letter-spacing:0.02em;">${appName}</span>`;

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${appName}</title>
      <style>
        body, p, h1, h2, h3 { direction: rtl !important; text-align: center !important; }
      </style>
    </head>
    <body dir="rtl" style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;direction:rtl;text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

              <!-- Logo -->
              <tr>
                <td align="center" style="padding-bottom:24px;">
                  ${logoBlock}
                </td>
              </tr>

              <!-- Card -->
              <tr>
                <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">

                  <!-- Accent bar -->
                  <div style="height:3px;background:${accentColor};"></div>

                  <!-- Header -->
                  <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:32px 32px 20px;">
                        <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align:middle;padding-left:12px;font-size:20px;">${headerIcon}</td>
                            <td style="vertical-align:middle;">
                              <h1 style="margin:0;color:${BRAND.ink};font-size:18px;font-weight:600;">${headerTitle}</h1>
                              ${headerSubtitle ? `<p style="margin:4px 0 0;color:${BRAND.muted};font-size:13px;">${headerSubtitle}</p>` : ""}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <div style="height:1px;background:${BRAND.border};margin:0 32px;"></div>

                  <!-- Body -->
                  <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:24px 32px 32px;color:${BRAND.ink};font-size:14px;line-height:1.75;">
                        ${bodyHtml}
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top:24px;">
                  <p style="margin:0;color:${BRAND.faint};font-size:12px;">
                    تم الإرسال تلقائيًا من ${appName}
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ---------- Email templates ----------
function buildOwnerEmail({ user, contactMessage, service, hasLogo }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const bodyHtml = `
    <p style="margin:0 0 20px;color:${BRAND.muted};">
      وصلتك رسالة جديدة من زائر شاف البورتفوليو بتاعك.
    </p>

    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:10px;margin-bottom:20px;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;text-align:right;">
            <tr><td style="padding:4px 0;color:${BRAND.faint};width:90px;">الاسم</td><td style="padding:4px 0;color:${BRAND.ink};font-weight:500;">${contactMessage.senderInfo.firstName} ${contactMessage.senderInfo.lastName}</td></tr>
            <tr><td style="padding:4px 0;color:${BRAND.faint};">الإيميل</td><td style="padding:4px 0;"><a href="mailto:${contactMessage.senderInfo.email}" style="color:${BRAND.secondary};text-decoration:none;">${contactMessage.senderInfo.email}</a></td></tr>
            <tr><td style="padding:4px 0;color:${BRAND.faint};">التليفون</td><td style="padding:4px 0;"><a href="tel:${contactMessage.senderInfo.phoneNumber}" style="color:${BRAND.secondary};text-decoration:none;">${contactMessage.senderInfo.phoneNumber}</a></td></tr>
            ${service ? `<tr><td style="padding:4px 0;color:${BRAND.faint};">الخدمة</td><td style="padding:4px 0;color:${BRAND.ink};">${service}</td></tr>` : ""}
            <tr><td style="padding:4px 0;color:${BRAND.faint};">التاريخ</td><td style="padding:4px 0;color:${BRAND.ink};">${new Date().toLocaleString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;color:${BRAND.faint};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">الرسالة</p>
    <div style="background:${BRAND.softBg};padding:16px 18px;border-radius:10px;border:1px solid ${BRAND.border};white-space:pre-wrap;color:${BRAND.ink};font-size:14px;">
      ${contactMessage.message}
    </div>

    <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0" style="margin-top:26px;">
      <tr>
        <td style="padding-left:10px;">
          <a href="${appUrl}/dashboard/messages" style="display:inline-block;background:${BRAND.card};color:${BRAND.secondary};border:1px solid ${BRAND.border};padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">عرض كل الرسائل</a>
        </td>
        <td>
          <a href="mailto:${contactMessage.senderInfo.email}?subject=Re: Your message to ${user.name}" style="display:inline-block;background:${BRAND.primary};color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">الرد على الرسالة</a>
        </td>
      </tr>
    </table>
  `;

  return emailShell({
    headerIcon: "📩",
    headerTitle: "رسالة جديدة من البورتفوليو",
    headerSubtitle: "حد تواصل معاك من صفحة الاتصال",
    bodyHtml,
    accent: BRAND.primary,
    hasLogo,
  });
}

function buildConfirmationEmail({ user, portfolio, contactMessage, hasLogo }) {
  const preview =
    contactMessage.message.length > 150
      ? `${contactMessage.message.substring(0, 150)}...`
      : contactMessage.message;

  const bodyHtml = `
    <p style="margin:0 0 4px;color:${BRAND.ink};font-weight:600;">أهلاً ${contactMessage.senderInfo.firstName} 👋</p>
    <p style="margin:0 0 20px;color:${BRAND.muted};">
      شكرًا لتواصلك مع <strong style="color:${BRAND.ink};">${user.name}</strong>. رسالتك اتبعتت بنجاح
      وهيتواصل معاك في أقرب وقت.
    </p>

    <div style="background:${BRAND.softBg};padding:14px 16px;border-radius:10px;border:1px solid ${BRAND.border};margin:0 0 22px;color:${BRAND.muted};font-size:13px;font-style:italic;">
      "${preview}"
    </div>

    <p style="margin:0 0 8px;color:${BRAND.faint};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">بيانات التواصل</p>
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:10px;">
      <tr>
        <td style="padding:16px 18px;">
          <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;text-align:right;">
            <tr><td style="padding:4px 0;color:${BRAND.faint};width:90px;">الاسم</td><td style="padding:4px 0;color:${BRAND.ink};font-weight:500;">${user.name}</td></tr>
            ${user.profile?.company ? `<tr><td style="padding:4px 0;color:${BRAND.faint};">الشركة</td><td style="padding:4px 0;color:${BRAND.ink};">${user.profile.company}</td></tr>` : ""}
            ${portfolio.contactInfo?.email ? `<tr><td style="padding:4px 0;color:${BRAND.faint};">الإيميل</td><td style="padding:4px 0;color:${BRAND.ink};">${portfolio.contactInfo.email}</td></tr>` : ""}
            ${portfolio.contactInfo?.phone ? `<tr><td style="padding:4px 0;color:${BRAND.faint};">التليفون</td><td style="padding:4px 0;color:${BRAND.ink};">${portfolio.contactInfo.phone}</td></tr>` : ""}
            ${portfolio.contactInfo?.location ? `<tr><td style="padding:4px 0;color:${BRAND.faint};">الموقع</td><td style="padding:4px 0;color:${BRAND.ink};">${portfolio.contactInfo.location}</td></tr>` : ""}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:22px 0 0;color:${BRAND.faint};font-size:12px;font-style:italic;">
      ده إيميل تأكيد تلقائي، من فضلك متردش عليه مباشرة.
    </p>
  `;

  return emailShell({
    headerIcon: "✅",
    headerTitle: "تم إرسال رسالتك بنجاح",
    headerSubtitle: null,
    bodyHtml,
    accent: BRAND.secondary,
    hasLogo,
  });
}

function buildAdminEmail({ user, portfolio, contactMessage, service, hasLogo }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const senderFullName = `${contactMessage.senderInfo.firstName} ${contactMessage.senderInfo.lastName}`;

  const bodyHtml = `
    <p style="margin:0 0 4px;color:${BRAND.ink};font-weight:600;">أهلاً يا مدير 👋</p>
    <p style="margin:0 0 20px;color:${BRAND.muted};">
      في شخص اسمه <strong style="color:${BRAND.ink};">${senderFullName}</strong>
      بعت رسالة لـ <strong style="color:${BRAND.ink};">${user?.name || "صاحب بورتفوليو"}</strong>
      عن طريق البورتفوليو بتاعه.
    </p>

    <p style="margin:0 0 8px;color:${BRAND.faint};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">صاحب البورتفوليو</p>
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:10px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 18px;">
          <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;text-align:right;">
            <tr><td style="padding:4px 0;color:${BRAND.faint};width:90px;">الاسم</td><td style="padding:4px 0;color:${BRAND.ink};font-weight:500;">${user?.name || "-"}</td></tr>
            <tr><td style="padding:4px 0;color:${BRAND.faint};">الإيميل</td><td style="padding:4px 0;color:${BRAND.ink};">${user?.contactEmail || user?.email || "-"}</td></tr>
            <tr><td style="padding:4px 0;color:${BRAND.faint};">البورتفوليو</td><td style="padding:4px 0;"><a href="${appUrl}/portfolio/${portfolio._id}" style="color:${BRAND.secondary};text-decoration:none;">${appUrl}/portfolio/${portfolio._id}</a></td></tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;color:${BRAND.faint};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">الشخص اللي بعت</p>
    <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:10px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 18px;">
          <table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;text-align:right;">
            <tr><td style="padding:4px 0;color:${BRAND.faint};width:90px;">الاسم</td><td style="padding:4px 0;color:${BRAND.ink};font-weight:500;">${senderFullName}</td></tr>
            <tr><td style="padding:4px 0;color:${BRAND.faint};">الإيميل</td><td style="padding:4px 0;"><a href="mailto:${contactMessage.senderInfo.email}" style="color:${BRAND.secondary};text-decoration:none;">${contactMessage.senderInfo.email}</a></td></tr>
            <tr><td style="padding:4px 0;color:${BRAND.faint};">التليفون</td><td style="padding:4px 0;"><a href="tel:${contactMessage.senderInfo.phoneNumber}" style="color:${BRAND.secondary};text-decoration:none;">${contactMessage.senderInfo.phoneNumber}</a></td></tr>
            ${service ? `<tr><td style="padding:4px 0;color:${BRAND.faint};">الخدمة</td><td style="padding:4px 0;color:${BRAND.ink};">${service}</td></tr>` : ""}
            <tr><td style="padding:4px 0;color:${BRAND.faint};">التاريخ</td><td style="padding:4px 0;color:${BRAND.ink};">${new Date().toLocaleString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>
            <tr><td style="padding:4px 0;color:${BRAND.faint};">IP</td><td style="padding:4px 0;color:${BRAND.ink};">${contactMessage.ipAddress || "-"}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;color:${BRAND.faint};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;">الرسالة</p>
    <div style="background:${BRAND.softBg};padding:16px 18px;border-radius:10px;border:1px solid ${BRAND.border};white-space:pre-wrap;color:${BRAND.ink};font-size:14px;">
      ${contactMessage.message}
    </div>
  `;

  return emailShell({
    headerIcon: "🛠️",
    headerTitle: "رسالة جديدة على المنصة",
    headerSubtitle: "نسخة إدارية للمتابعة",
    bodyHtml,
    accent: BRAND.secondary,
    hasLogo,
  });
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
      const logoAttachment = await getLogoAttachment();
      const attachments = logoAttachment ? [logoAttachment] : [];
      const hasLogo = Boolean(logoAttachment);
      const senderFullNameForSubject = `${contactMessage.senderInfo.firstName} ${contactMessage.senderInfo.lastName}`;

      // إيميلات صاحب البورتفوليو (بتاخد نفس نسخة "رسالة جديدة" العادية)
      const ownerRecipients = [...new Set(
        [user?.contactEmail, user?.email, portfolio.contactInfo?.email]
          .filter((email) => email && EMAIL_REGEX.test(email))
          .map((email) => email.toLowerCase().trim())
      )];

      // الإيميل الأساسي/الأدمن (بياخد نسخة مختلفة فيها "مين بعت لمين")
      const adminEmail =
        process.env.EMAIL_USER && EMAIL_REGEX.test(process.env.EMAIL_USER)
          ? process.env.EMAIL_USER.toLowerCase().trim()
          : null;

      if (ownerRecipients.length > 0) {
        const results = await Promise.all(
          ownerRecipients.map((to) =>
            sendEmail(
              transporter,
              {
                from: `"${process.env.EMAIL_FROM_NAME || "Portfolio App"}" <${process.env.EMAIL_USER}>`,
                to,
                subject: `📩 New message from ${contactMessage.senderInfo.firstName} via your portfolio`,
                html: buildOwnerEmail({ user, contactMessage, service: safeService, hasLogo }),
                replyTo: contactMessage.senderInfo.email,
                attachments,
              },
              `owner-email:${to}`
            )
          )
        );
        emailSent = results.some((r) => r.success);
      } else {
        console.warn("⚠️ No valid recipient email found for portfolio owner:", user?._id);
      }

      if (adminEmail) {
        await sendEmail(
          transporter,
          {
            from: `"${process.env.EMAIL_FROM_NAME || "Portfolio App"}" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: `🛠️ [Admin] ${senderFullNameForSubject} → ${user?.name || "Unknown owner"}`,
            html: buildAdminEmail({ user, portfolio, contactMessage, service: safeService, hasLogo }),
            replyTo: contactMessage.senderInfo.email,
            attachments,
          },
          `admin-email:${adminEmail}`
        );
      }

      const confirmationResult = await sendEmail(
        transporter,
        {
          from: `"${process.env.EMAIL_FROM_NAME || "Portfolio App"}" <${process.env.EMAIL_USER}>`,
          to: contactMessage.senderInfo.email,
          subject: `✅ Message sent to ${user?.name || "the owner"} confirmed`,
          html: buildConfirmationEmail({ user, portfolio, contactMessage, hasLogo }),
          attachments,
        },
        "confirmation-email"
      );
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