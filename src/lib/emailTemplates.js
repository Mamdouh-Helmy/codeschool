// src/lib/emailTemplates.js
import path from "path";
import fs from "fs";

// ---------- Brand tokens (matched to tailwind.config.js) ----------
export const BRAND = {
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

// ---------- Logo attachment (embedded via CID) ----------
let cachedLogoBuffer = null;

export async function getLogoAttachment() {
  if (cachedLogoBuffer) {
    return {
      filename: "logo.png",
      content: cachedLogoBuffer,
      cid: "portfolio-logo",
      contentType: "image/png",
      contentDisposition: "inline",
    };
  }

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

// ---------- Shared email shell (logo + card + accent bar + footer) ----------
export function emailShell({ headerIcon, headerTitle, headerSubtitle, bodyHtml, accent, hasLogo, rtl = true }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Portfolio App";
  const accentColor = accent || BRAND.primary;
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";

  const logoBlock = hasLogo
    ? `<img src="cid:portfolio-logo" alt="${appName}" width="120" height="30" style="height:30px;width:auto;display:block;border:0;outline:none;" />`
    : `<span style="font-size:16px;font-weight:700;color:${BRAND.secondary};letter-spacing:0.02em;">${appName}</span>`;

  return `
    <!DOCTYPE html>
    <html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${appName}</title>
      <style>
        body, p, h1, h2, h3 { direction: ${dir} !important; text-align: center !important; }
      </style>
    </head>
    <body dir="${dir}" style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;direction:${dir};text-align:center;">
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
                  <table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:32px 32px 20px;">
                        <table role="presentation" dir="${dir}" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align:middle;padding-${rtl ? "left" : "right"}:12px;font-size:20px;">${headerIcon}</td>
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
                  <table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:24px 32px 32px;color:${BRAND.ink};font-size:14px;line-height:1.75;text-align:${align};">
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
                    ${rtl ? `تم الإرسال تلقائيًا من ${appName}` : `Sent automatically from ${appName}`}
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

// ---------- Reply email (owner → visitor) ----------
export function buildReplyEmail({ ownerName, senderName, replyMessage, locale, hasLogo }) {
  const rtl = locale === "ar";

  const bodyHtml = `
    <p style="margin:0 0 4px;color:${BRAND.ink};font-weight:600;">
      ${rtl ? `أهلاً ${senderName} 👋` : `Hi ${senderName} 👋`}
    </p>
    <p style="margin:0 0 24px;color:${BRAND.muted};">
      ${rtl
        ? `<strong style="color:${BRAND.ink};">${ownerName}</strong> كتبلك:`
        : `<strong style="color:${BRAND.ink};">${ownerName}</strong> wrote:`}
    </p>

    <div style="background:${BRAND.softBg};padding:16px 18px;border-radius:10px;border:1px solid ${BRAND.border};white-space:pre-wrap;color:${BRAND.ink};font-size:14px;">
      ${replyMessage.replace(/</g, "&lt;")}
    </div>

    <p style="margin:22px 0 0;color:${BRAND.faint};font-size:12px;font-style:italic;">
      ${rtl
        ? "تقدر ترد على الإيميل ده عادي لو حابب تكمل المحادثة."
        : "Feel free to reply to this email if you'd like to continue the conversation."}
    </p>
  `;

  return emailShell({
    headerIcon: "💬",
    headerTitle: rtl ? `رسالة من ${ownerName}` : `Message from ${ownerName}`,
    headerSubtitle: null,
    bodyHtml,
    accent: BRAND.primary,
    hasLogo,
    rtl,
  });
}