// app/api/portfolio/contact/route.js
import { NextResponse } from "next/server";
import Portfolio from "../../../models/Portfolio";
import User from "../../../models/User";
import ContactMessage from "../../../models/ContactMessage";
import { connectDB } from "@/lib/mongodb";
import nodemailer from "nodemailer";

// إعداد إرسال البريد الإلكتروني
const createTransporter = () => {
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
};

// وظيفة إرسال البريد الإلكتروني
async function sendEmail(transporter, options) {
  try {
    const info = await transporter.sendMail(options);
    console.log("📧 Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("📧 Email sending error:", error);
    return { success: false, error: error.message };
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { portfolioId, senderInfo, message } = body;

    // التحقق من البيانات المطلوبة
    if (!portfolioId || !senderInfo || !message) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // التحقق من صحة البيانات
    const errors = [];
    if (!senderInfo.firstName?.trim()) errors.push("First name is required");
    if (!senderInfo.lastName?.trim()) errors.push("Last name is required");
    if (
      !senderInfo.email?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderInfo.email)
    ) {
      errors.push("Valid email is required");
    }
    if (!senderInfo.phoneNumber?.trim()) errors.push("Phone number is required");
    if (!message.trim() || message.length < 10)
      errors.push("Message should be at least 10 characters");
    if (message.length > 2000) errors.push("Message is too long");

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: "Invalid data", errors },
        { status: 400 }
      );
    }

    // البحث عن البورتفليو
    const portfolio = await Portfolio.findById(portfolioId).populate(
      "userId",
      "name email contactEmail notifications"
    );

    if (!portfolio) {
      return NextResponse.json(
        { success: false, message: "Portfolio not found" },
        { status: 404 }
      );
    }

    const user = portfolio.userId;

    // التحقق مما إذا كان البورتفليو منشور
    if (!portfolio.isPublished) {
      return NextResponse.json(
        { success: false, message: "Portfolio is not published" },
        { status: 400 }
      );
    }

    // حفظ الرسالة في قاعدة البيانات
    const contactMessage = await ContactMessage.create({
      portfolioId,
      senderInfo: {
        firstName: senderInfo.firstName.trim(),
        lastName: senderInfo.lastName.trim(),
        email: senderInfo.email.toLowerCase().trim(),
        phoneNumber: senderInfo.phoneNumber.trim(),
      },
      message: message.trim(),
      ipAddress: req.headers.get("x-forwarded-for") || "Unknown",
      userAgent: req.headers.get("user-agent") || "Unknown",
      referrer: req.headers.get("referer") || "Direct",
    });

    // إرسال البريد الإلكتروني
    let emailSent = false;
    let confirmationSent = false;
    const transporter = createTransporter();

    if (transporter) {
      const recipientEmail = user.contactEmail || user.email;

      // إرسال البريد لصاحب البورتفليو
      if (recipientEmail) {
        const emailContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Message from Your Portfolio</title>
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
                background-color: #f5f7fa;
              }
              .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 30px; 
                text-align: center; 
                border-radius: 10px 10px 0 0; 
                margin-bottom: 0;
              }
              .content { 
                background: white; 
                padding: 30px; 
                border-radius: 0 0 10px 10px; 
                border: 1px solid #e0e0e0; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .message-box { 
                background: #f8f9fa; 
                padding: 20px; 
                border-radius: 8px; 
                border-left: 4px solid #667eea; 
                margin: 20px 0; 
                white-space: pre-wrap;
              }
              .sender-info { 
                background: #f5f5f5; 
                padding: 20px; 
                border-radius: 6px; 
                margin-bottom: 20px; 
                border: 1px solid #e0e0e0;
              }
              .footer { 
                margin-top: 30px; 
                padding-top: 20px; 
                border-top: 1px solid #ddd; 
                color: #666; 
                font-size: 12px; 
                text-align: center; 
              }
              .button { 
                display: inline-block; 
                background: #667eea; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 10px 5px; 
                font-weight: 500;
                transition: background 0.3s ease;
              }
              .button:hover {
                background: #5a67d8;
              }
              .info-item { 
                margin-bottom: 10px; 
                display: flex;
                align-items: center;
              }
              .info-label { 
                font-weight: 600; 
                color: #555; 
                min-width: 120px; 
                display: inline-block; 
              }
              h1, h2, h3 {
                margin-top: 0;
              }
              a {
                color: #667eea;
                text-decoration: none;
              }
              a:hover {
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📩 New Message from Your Portfolio</h1>
              <p>You have received a new message via your portfolio contact form</p>
            </div>
            
            <div class="content">
              <div class="sender-info">
                <h3 style="margin-top: 0; color: #667eea;">Sender Information:</h3>
                <div class="info-item">
                  <span class="info-label">Name:</span>
                  <span>${contactMessage.senderInfo.firstName} ${contactMessage.senderInfo.lastName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Email:</span>
                  <a href="mailto:${contactMessage.senderInfo.email}">${contactMessage.senderInfo.email}</a>
                </div>
                <div class="info-item">
                  <span class="info-label">Phone:</span>
                  <a href="tel:${contactMessage.senderInfo.phoneNumber}">${contactMessage.senderInfo.phoneNumber}</a>
                </div>
                <div class="info-item">
                  <span class="info-label">Date:</span>
                  <span>${new Date().toLocaleString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>
              
              <h3 style="color: #667eea;">Message Content:</h3>
              <div class="message-box">
                ${contactMessage.message}
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/messages" class="button">📋 View All Messages</a>
                <a href="mailto:${contactMessage.senderInfo.email}?subject=Re: Your message to ${user.name}" class="button" style="background: #48bb78;">📧 Reply to Sender</a>
              </div>
            </div>
            
            <div class="footer">
              <p>This message was sent automatically from ${process.env.NEXT_PUBLIC_APP_NAME || 'Portfolio App'}</p>
              <p>If you don't want to receive these notifications, you can update your notification settings in your account.</p>
            </div>
          </body>
          </html>
        `;

        const mailOptions = {
          from: `"${process.env.EMAIL_FROM_NAME || 'Portfolio App'}" <${process.env.EMAIL_USER}>`,
          to: recipientEmail,
          subject: `📩 New message from ${contactMessage.senderInfo.firstName} via your portfolio`,
          html: emailContent,
          replyTo: contactMessage.senderInfo.email,
        };

        const emailResult = await sendEmail(transporter, mailOptions);
        emailSent = emailResult.success;
      }

      // إرسال تأكيد للمرسل
      const confirmationContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Message Sent Successfully</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
              background-color: #f5f7fa;
            }
            .header { 
              background: linear-gradient(135deg, #4299e1 0%, #667eea 100%); 
              color: white; 
              padding: 30px; 
              text-align: center; 
              border-radius: 10px 10px 0 0; 
            }
            .content { 
              background: white; 
              padding: 30px; 
              border-radius: 0 0 10px 10px; 
              border: 1px solid #e0e0e0; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #ddd; 
              color: #666; 
              font-size: 12px; 
              text-align: center; 
            }
            .message-preview {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 6px;
              border-left: 4px solid #4299e1;
              margin: 20px 0;
              font-style: italic;
              color: #555;
            }
            .contact-info {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .info-item {
              margin-bottom: 8px;
            }
            .info-label {
              font-weight: 600;
              color: #555;
              display: inline-block;
              min-width: 80px;
            }
            h1, h2, h3 {
              margin-top: 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✅ Message Sent Successfully</h1>
          </div>
          
          <div class="content">
            <p>Hi ${contactMessage.senderInfo.firstName},</p>
            
            <p>Thank you for contacting <strong>${user.name}</strong>. Your message has been sent successfully and ${user.name} will get back to you as soon as possible.</p>
            
            <div class="message-preview">
              "${contactMessage.message.substring(0, 150)}${contactMessage.message.length > 150 ? '...' : ''}"
            </div>
            
            <div class="contact-info">
              <h3 style="color: #4299e1; margin-top: 0;">Contact Information:</h3>
              <div class="info-item">
                <span class="info-label">Name:</span>
                <span>${user.name}</span>
              </div>
              ${user.profile?.company ? `
              <div class="info-item">
                <span class="info-label">Company:</span>
                <span>${user.profile.company}</span>
              </div>
              ` : ''}
              ${portfolio.contactInfo?.email ? `
              <div class="info-item">
                <span class="info-label">Email:</span>
                <span>${portfolio.contactInfo.email}</span>
              </div>
              ` : ''}
              ${portfolio.contactInfo?.phone ? `
              <div class="info-item">
                <span class="info-label">Phone:</span>
                <span>${portfolio.contactInfo.phone}</span>
              </div>
              ` : ''}
              ${portfolio.contactInfo?.location ? `
              <div class="info-item">
                <span class="info-label">Location:</span>
                <span>${portfolio.contactInfo.location}</span>
              </div>
              ` : ''}
            </div>
            
            <p style="margin-top: 30px; font-style: italic; color: #666;">
              This is an automatic confirmation email. Please do not reply to this email directly.
            </p>
            
            <p style="margin-top: 20px;">
              Best regards,<br>
              <strong>The ${process.env.NEXT_PUBLIC_APP_NAME || 'Portfolio App'} Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>This email was sent automatically from ${process.env.NEXT_PUBLIC_APP_NAME || 'Portfolio App'}</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </body>
        </html>
      `;

      const confirmationOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Portfolio App'}" <${process.env.EMAIL_USER}>`,
        to: contactMessage.senderInfo.email,
        subject: `✅ Message sent to ${user.name} confirmed`,
        html: confirmationContent,
      };

      const confirmationResult = await sendEmail(transporter, confirmationOptions);
      confirmationSent = confirmationResult.success;
    }

    // تحديث عدد الرسائل في البورتفليو
    if (!portfolio.messagesCount) {
      await Portfolio.findByIdAndUpdate(portfolioId, {
        $set: { messagesCount: 1 }
      });
    } else {
      await Portfolio.findByIdAndUpdate(portfolioId, {
        $inc: { messagesCount: 1 }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: contactMessage._id,
        emailSent,
        confirmationSent
      }
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred while sending the message',
        error: error.message 
      },
      { status: 500 }
    );
  }
}