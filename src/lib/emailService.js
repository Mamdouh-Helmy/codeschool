// lib/emailService.js - إصدار معدل
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

// ---------- Brand tokens ----------
const BRAND = {
  primary: "#8c52ff",
  primaryDeep: "#6d3fd1",
  ink: "#102C46",
  muted: "#547593",
  faint: "#8FACC6",
  bg: "#f4f6f9",
  card: "#ffffff",
  border: "#e7edf3",
  softBg: "#f7f9fc",
};

// ---------- Logo attachment (embedded via CID, cached in memory) ----------
let cachedLogoBuffer = null;

async function getLogoAttachment() {
  if (cachedLogoBuffer) {
    return {
      filename: "logo.png",
      content: cachedLogoBuffer,
      cid: "codeschool-logo",
      contentType: "image/png",
      contentDisposition: "inline",
    };
  }

  // 1) Try local filesystem first (works on traditional/self-hosted servers,
  //    and on serverless platforms once public/ is bundled via
  //    outputFileTracingIncludes in next.config.js).
  try {
    const logoPath = path.join(process.cwd(), "public/images/logo/footer-logo-white.png");
    if (fs.existsSync(logoPath)) {
      cachedLogoBuffer = fs.readFileSync(logoPath);
      return {
        filename: "logo.png",
        content: cachedLogoBuffer,
        cid: "codeschool-logo",
        contentType: "image/png",
        contentDisposition: "inline",
      };
    }
    console.warn("⚠️ Logo not found on local filesystem at:", logoPath);
  } catch (error) {
    console.warn("⚠️ Filesystem read for logo failed:", error.message);
  }

  // 2) Fallback: fetch the already-hosted logo over HTTP and embed it as CID.
  try {
    const res = await fetch("https://i.ibb.co/rftm186y/footer-logo-white.png");
    if (!res.ok) {
      console.warn("⚠️ Logo fetch fallback failed with status:", res.status);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    cachedLogoBuffer = Buffer.from(arrayBuffer);
    return {
      filename: "logo.png",
      content: cachedLogoBuffer,
      cid: "codeschool-logo",
      contentType: "image/png",
      contentDisposition: "inline",
    };
  } catch (error) {
    console.warn("⚠️ Logo fetch fallback errored:", error.message);
    return null;
  }
}

function buildVerificationEmail({ otp, hasLogo }) {
  const logoBlock = hasLogo
    ? `<img src="cid:codeschool-logo" alt="CodeSchool" width="52" height="52" style="width:52px;height:52px;border-radius:12px;display:block;margin:0 auto 14px;border:0;outline:none;" />`
    : `<div style="font-size:22px;font-weight:800;color:#ffffff;margin:0 auto 14px;">CodeSchool</div>`;

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>التحقق من البريد الإلكتروني</title>
      <style>
        body, p, h1, h2, h3 { direction: rtl !important; text-align: center !important; }
      </style>
    </head>
    <body dir="rtl" style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;direction:rtl;text-align:center;-webkit-font-smoothing:antialiased;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${BRAND.card};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};">

              <!-- Header -->
              <tr>
                <td align="center" style="background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.ink} 100%);padding:34px 24px;">
                  ${logoBlock}
                  <p style="margin:0 0 6px;color:#EFFBFF;font-size:14px;">منصة تعلم البرمجة بالعربية</p>
                  <h1 style="margin:0 0 4px;color:#ffffff;font-size:21px;font-weight:700;">تحقق من بريدك الإلكتروني</h1>
                  <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;">أكمل تسجيلك في ثوانٍ</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 28px;">
                  <p style="margin:0 0 22px;color:${BRAND.ink};font-size:15px;line-height:1.7;">
                    أهلاً وسهلاً بك في <strong style="color:${BRAND.primary};">CodeSchool</strong>! نحن متحمسون لانضمامك إلينا.
                    لإكمال تسجيلك وبدء رحلتك في البرمجة، يرجى التحقق من بريدك الإلكتروني.
                  </p>

                  <!-- OTP -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDeep} 100%);border-radius:12px;margin:0 0 24px;">
                    <tr>
                      <td align="center" style="padding:22px;">
                        <p style="margin:0 0 12px;color:#ffffff;font-size:14px;font-weight:500;">كود التحقق الخاص بك</p>
                        <div dir="ltr" style="direction:ltr;unicode-bidi:isolate;display:inline-block;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:8px;font-family:'Courier New',monospace;background:rgba(255,255,255,0.12);padding:14px 20px;border-radius:8px;border:2px dashed rgba(255,255,255,0.35);">
                          ${otp}
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Steps -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
                    <tr>
                      <td style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:8px;padding:12px 14px;">
                        <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="width:32px;height:32px;background:${BRAND.primary};border-radius:50%;color:#fff;font-weight:700;text-align:center;vertical-align:middle;">١</td>
                            <td style="padding-right:12px;color:${BRAND.ink};font-size:13px;font-weight:500;">انسخ كود التحقق أعلاه</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td style="height:8px;"></td></tr>
                    <tr>
                      <td style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:8px;padding:12px 14px;">
                        <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="width:32px;height:32px;background:${BRAND.primary};border-radius:50%;color:#fff;font-weight:700;text-align:center;vertical-align:middle;">٢</td>
                            <td style="padding-right:12px;color:${BRAND.ink};font-size:13px;font-weight:500;">ارجع إلى صفحة التسجيل</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr><td style="height:8px;"></td></tr>
                    <tr>
                      <td style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:8px;padding:12px 14px;">
                        <table role="presentation" dir="rtl" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="width:32px;height:32px;background:${BRAND.primary};border-radius:50%;color:#fff;font-weight:700;text-align:center;vertical-align:middle;">٣</td>
                            <td style="padding-right:12px;color:${BRAND.ink};font-size:13px;font-weight:500;">أدخل الكود في حقل التحقق</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Features -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
                    <tr>
                      <td width="50%" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:8px;padding:14px;text-align:center;">
                        <div style="font-size:18px;margin-bottom:4px;">🎯</div>
                        <div style="font-size:12px;color:${BRAND.muted};font-weight:500;">دروس متخصصة</div>
                      </td>
                      <td width="8"></td>
                      <td width="50%" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:8px;padding:14px;text-align:center;">
                        <div style="font-size:18px;margin-bottom:4px;">👨‍🏫</div>
                        <div style="font-size:12px;color:${BRAND.muted};font-weight:500;">مدربين محترفين</div>
                      </td>
                    </tr>
                    <tr><td colspan="3" style="height:8px;"></td></tr>
                    <tr>
                      <td width="50%" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:8px;padding:14px;text-align:center;">
                        <div style="font-size:18px;margin-bottom:4px;">📚</div>
                        <div style="font-size:12px;color:${BRAND.muted};font-weight:500;">مسارات تعليمية</div>
                      </td>
                      <td width="8"></td>
                      <td width="50%" style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:8px;padding:14px;text-align:center;">
                        <div style="font-size:18px;margin-bottom:4px;">🏆</div>
                        <div style="font-size:12px;color:${BRAND.muted};font-weight:500;">شهادات معتمدة</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Warning -->
                  <div style="background:#FFF3CD;border:1px solid #FFE15A;color:#856404;padding:14px;border-radius:8px;margin-bottom:20px;font-size:13px;">
                    <strong>⏰ هذا الكود سينتهي خلال 10 دقائق</strong><br />
                    لأسباب أمنية، يرجى استخدامه فوراً.
                  </div>

                  <!-- Info -->
                  <div style="background:${BRAND.softBg};border:1px solid ${BRAND.border};border-radius:8px;padding:16px;">
                    <p style="margin:0 0 6px;color:${BRAND.ink};font-weight:600;font-size:14px;">💡 لماذا التحقق من البريد الإلكتروني؟</p>
                    <p style="margin:0;color:${BRAND.muted};font-size:13px;line-height:1.6;">
                      التحقق من البريد الإلكتروني يضمن أمان حسابك ويسمح لنا بإرسال التحديثات المهمة
                      حول دوراتك، تقدمك، والعروض الخاصة.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="background:${BRAND.ink};padding:24px;">
                  <p style="margin:0 0 10px;">
                    <a href="#" style="color:#46C4FF;text-decoration:none;font-size:13px;margin:0 6px;">الموقع الإلكتروني</a>
                    <a href="#" style="color:#46C4FF;text-decoration:none;font-size:13px;margin:0 6px;">تويتر</a>
                    <a href="#" style="color:#46C4FF;text-decoration:none;font-size:13px;margin:0 6px;">فيسبوك</a>
                  </p>
                  <p style="margin:0 0 10px;color:#EFFBFF;font-size:13px;">
                    تحتاج مساعدة؟ <a href="mailto:support@codeschool.com" style="color:#46C4FF;text-decoration:none;">اتصل بفريق الدعم</a>
                  </p>
                  <p style="margin:0;color:${BRAND.faint};font-size:11px;line-height:1.5;">
                    © 2024 CodeSchool. جميع الحقوق محفوظة.<br />
                    نبني مستقبل تعليم البرمجة، طالباً واحداً في كل مرة.
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

export async function sendVerificationEmail(email, otp) {
  try {
    console.log("📧 Verification OTP:");
    console.log("To:", email);
    console.log("OTP:", otp);
    console.log("-------------------");

    const result = {
      success: true,
      message: "Email sent successfully",
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const logoAttachment = await getLogoAttachment();
      const attachments = logoAttachment ? [logoAttachment] : [];
      const hasLogo = Boolean(logoAttachment);

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: "🔐 تحقق من بريدك الإلكتروني - CodeSchool",
        html: buildVerificationEmail({ otp, hasLogo }),
        attachments,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Professional email with images sent to: ${email}`);
      result.message = `Email sent successfully to ${email}`;
    } else {
      console.log("ℹ️ SMTP not configured, only printing OTP to console");
      result.message = "SMTP not configured, OTP printed to console";
    }

    return result;
  } catch (error) {
    console.error("❌ Email sending error:", error.message);
    return {
      success: false,
      error: error.message,
      message: "Failed to send email",
    };
  }
}