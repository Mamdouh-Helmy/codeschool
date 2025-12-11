// lib/emailService.js - إصدار معدل
import nodemailer from "nodemailer";

export async function sendVerificationEmail(email, otp) {
  try {
    console.log("📧 Verification OTP:");
    console.log("To:", email);
    console.log("OTP:", otp);
    console.log("-------------------");

    // إرجاع كائن بدلاً من boolean
    const result = {
      success: true,
      message: "Email sent successfully"
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

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: "🔐 تحقق من بريدك الإلكتروني - CodeSchool",
        html: `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>التحقق من البريد الإلكتروني</title>
            <style>
                /* CSS الأساسي المدعوم في البريد الإلكتروني */
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                    font-family: Arial, sans-serif;
                    direction: rtl;
                }
                
                .container {
                    width: 100%;
                    max-width: 700px;
                    margin: 0 auto;
                    background-color: #ffffff;
                }
                
                .header {
                    background: linear-gradient(135deg, #8c52ff 0%, #102C46 100%);
                    padding: 20px;
                    text-align: center;
                    color: white;
                }
                
                .logo-container {
                    text-align: center;
                    margin-bottom: 15px;
                }
                
                .logo-img {
                    width: 60px;
                    height: 60px;
                    border-radius: 12px;
                    border: 2px solid rgba(255,255,255,0.3);
                }
                
                .logo-text {
                    font-size: 28px;
                    font-weight: bold;
                    color: white;
                    margin: 10px 0;
                }
                
                .logo-subtitle {
                    font-size: 16px;
                    color: #EFFBFF;
                    margin-bottom: 15px;
                }
                
                .title {
                    font-size: 24px;
                    font-weight: 600;
                    margin: 10px 0;
                }
                
                .subtitle {
                    font-size: 16px;
                }
                
                .content {
                    padding: 20px;
                }
                
                .welcome-text {
                    font-size: 18px;
                    color: #102D47;
                    margin-bottom: 20px;
                    line-height: 1.6;
                    text-align: center;
                }
                
                .otp-container {
                    background: linear-gradient(135deg, #8c52ff 0%, #46C4FF 100%);
                    padding: 20px;
                    text-align: center;
                    margin: 20px 0;
                    border: 2px solid #EFFBFF;
                }
                
                .otp-label {
                    color: white;
                    font-size: 18px;
                    margin-bottom: 15px;
                    font-weight: 500;
                }
                
                .otp-code {
                    font-size: 42px;
                    font-weight: bold;
                    color: white;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                    background: rgba(255,255,255,0.1);
                    padding: 15px;
                    border: 2px dashed rgba(255,255,255,0.3);
                    display: inline-block;
                }
                
                .info-box {
                    background: #EFFBFF;
                    padding: 20px;
                    border-right: 4px solid #8c52ff;
                    margin: 20px 0;
                }
                
                .info-title {
                    color: #102C46;
                    font-weight: 600;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                
                .info-text {
                    color: #547593;
                    line-height: 1.5;
                    font-size: 14px;
                }
                
                .step {
                    margin-bottom: 12px;
                    padding: 12px;
                    background: #F8F9FA;
                    border: 1px solid #E1F1F6;
                }
                
                .step-number {
                    background: #8c52ff;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: inline-block;
                    text-align: center;
                    line-height: 32px;
                    font-weight: bold;
                    margin-left: 18px;
                }
                
                .step-text {
                    color: #102D47;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .warning {
                    background: #FFF3CD;
                    border: 2px solid #FFE15A;
                    color: #856404;
                    padding: 15px;
                    margin: 20px 0;
                    text-align: center;
                    font-weight: 500;
                }
                
                .features-table {
                    width: 100%;
                    margin: 20px 0;
                    border-collapse: collapse;
                }
                
                .feature-cell {
                    background: #F8F9FA;
                    padding: 12px;
                    border: 1px solid #E1F1F6;
                    text-align: center;
                    width: 50%;
                }
                
                .feature-icon {
                    font-size: 20px;
                    margin-bottom: 6px;
                    color: #8c52ff;
                }
                
                .feature-text {
                    font-size: 12px;
                    color: #547593;
                    font-weight: 500;
                }
                
                .contact-image {
                    width: 100%;
                    max-width: 300px;
                    margin: 20px auto;
                    display: block;
                }
                
                .footer {
                    background: #102C46;
                    color: white;
                    padding: 25px;
                    text-align: center;
                }
                
                .social-links {
                    margin: 15px 0;
                }
                
                .social-link {
                    color: #46C4FF;
                    text-decoration: none;
                    margin: 0 8px;
                    font-weight: 500;
                    font-size: 14px;
                }
                
                .copyright {
                    font-size: 11px;
                    color: #8FACC6;
                    line-height: 1.4;
                    margin-top: 12px;
                }
                
                .support {
                    margin-top: 12px;
                    font-size: 13px;
                }
                
                .support a {
                    color: #46C4FF;
                    text-decoration: none;
                    font-weight: 500;
                }
                
                .brand-highlight {
                    color: #8c52ff;
                    font-weight: bold;
                }
                
                @media (max-width: 600px) {
                    .container {
                        width: 100% !important;
                    }
                    
                    .otp-code {
                        font-size: 32px;
                        letter-spacing: 6px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Header -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" class="header">
                    <tr>
                        <td align="center">
                            <div class="logo-container">
                                <!-- اللوجو -->
                                <img src="https://i.ibb.co/rftm186y/footer-logo-white.png" alt="CodeSchool Logo" class="logo-img" 
                                     onerror="this.style.display='none'">
                                <div class="logo-text">CodeSchool</div>
                            </div>
                            <div class="logo-subtitle">منصة تعلم البرمجة بالعربية</div>
                            <h1 class="title">تحقق من بريدك الإلكتروني</h1>
                            <p class="subtitle">أكمل تسجيلك في ثوانٍ</p>
                        </td>
                    </tr>
                </table>
                
                <!-- Content -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" class="content">
                    <tr>
                        <td>
                            <p class="welcome-text">
                                أهلاً وسهلاً بك في <span class="brand-highlight">CodeSchool</span>! نحن متحمسون لانضمامك إلينا. 
                                لإكمال تسجيلك وبدء رحلتك في البرمجة، يرجى التحقق من بريدك الإلكتروني.
                            </p>
                            
                            <!-- OTP Code -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" class="otp-container">
                                <tr>
                                    <td align="center">
                                        <div class="otp-label">كود التحقق الخاص بك</div>
                                        <div class="otp-code">${otp}</div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- صورة التواصل -->
                            <img src="https://i.ibb.co/Kj43s2rt/contact.png" alt="CodeSchool Contact" class="contact-image"
                                 onerror="this.style.display='none'">
                            
                            <!-- Steps -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td>
                                        <div class="step">
                                            <span class="step-number">١</span>
                                            <span class="step-text">انسخ كود التحقق أعلاه</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div class="step">
                                            <span class="step-number">٢</span>
                                            <span class="step-text">ارجع إلى صفحة التسجيل</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <div class="step">
                                            <span class="step-number">٣</span>
                                            <span class="step-text">أدخل الكود في حقل التحقق</span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Features -->
                            <table class="features-table" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td class="feature-cell">
                                        <div class="feature-icon">🎯</div>
                                        <div class="feature-text">دروس متخصصة</div>
                                    </td>
                                    <td class="feature-cell">
                                        <div class="feature-icon">👨‍🏫</div>
                                        <div class="feature-text">مدربين محترفين</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="feature-cell">
                                        <div class="feature-icon">📚</div>
                                        <div class="feature-text">مسارات تعليمية</div>
                                    </td>
                                    <td class="feature-cell">
                                        <div class="feature-icon">🏆</div>
                                        <div class="feature-text">شهادات معتمدة</div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Warning -->
                            <div class="warning">
                                <span>⏰</span>
                                <strong>هذا الكود سينتهي خلال 10 دقائق</strong>
                                <br>
                                لأسباب أمنية، يرجى استخدامه فوراً.
                            </div>
                            
                            <!-- Info Box -->
                            <div class="info-box">
                                <div class="info-title">💡 لماذا التحقق من البريد الإلكتروني؟</div>
                                <div class="info-text">
                                    التحقق من البريد الإلكتروني يضمن أمان حسابك ويسمح لنا بإرسال التحديثات المهمة 
                                    حول دوراتك، تقدمك، والعروض الخاصة.
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
                
                <!-- Footer -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" class="footer">
                    <tr>
                        <td align="center">
                            <div class="social-links">
                                <a href="#" class="social-link">الموقع الإلكتروني</a>
                                <a href="#" class="social-link">تويتر</a>
                                <a href="#" class="social-link">فيسبوك</a>
                                <a href="#" class="social-link">لينكد إن</a>
                            </div>
                            
                            <div class="support">
                                تحتاج مساعدة؟ <a href="mailto:support@codeschool.com">اتصل بفريق الدعم</a>
                            </div>
                            
                            <div class="copyright">
                                © 2024 CodeSchool. جميع الحقوق محفوظة.<br>
                                نبني مستقبل تعليم البرمجة، طالباً واحداً في كل مرة.
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
        `,
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
      message: "Failed to send email"
    };
  }
}