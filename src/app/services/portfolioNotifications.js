// /src/app/services/portfolioNotifications.js
import MessageTemplate from "../models/MessageTemplate";
import TemplateVariable from "../models/TemplateVariable";
import Student from "../models/Student"; // ✅ جديد
import { wapilotService } from "./wapilot-service";

// ── جلب محتوى القالب (DB أو fallback) ──────────────────────────────────────
async function getPortfolioTemplateContent(templateType, language) {
  const template = await MessageTemplate.findOne({
    templateType,
    recipientType: "portfolio_owner",
    isActive: true,
    isDefault: true,
  }).lean();

  if (template) {
    const content = language === "ar" ? template.contentAr : template.contentEn;
    if (content && content.trim() !== "") return content;
    return language === "ar" ? template.contentEn : template.contentAr;
  }

  const { getFallbackTemplates } = await import("../models/MessageTemplate");
  const fb = getFallbackTemplates()[templateType];
  return fb ? (language === "ar" ? fb.ar : fb.en) : "";
}

// ── بناء map المتغيرات (عام + خاص باليوزر) ──────────────────────────────────
async function buildVarsMap(language, owner, extraVars = {}) {
  const ownerGender = owner.gender === "female" ? "female" : "male";

  const varsMap = await TemplateVariable.getVarsMap(language, { ownerGender });

  const ownerFirstName = owner.name?.split(" ")[0] || owner.name || "";
  varsMap["{ownerName}"] = ownerFirstName;

  Object.entries(extraVars).forEach(([key, value]) => {
    varsMap[`{${key}}`] = value;
  });

  return varsMap;
}

function renderTemplate(content, varsMap) {
  let result = content || "";
  for (const [token, value] of Object.entries(varsMap)) {
    result = result.split(token).join(value ?? "");
  }
  return result;
}

/**
 * ✅ جلب رقم صاحب البورتفوليو من كل المصادر المحتملة بالترتيب:
 * 1) User.profile.phone
 * 2) Portfolio.contactInfo.phone
 * 3) Student.personalInfo.whatsappNumber / phone (لو صاحب البورتفوليو أصله طالب)
 */
export async function resolveOwnerPhone(owner, portfolio) {
  if (owner.profile?.phone) return owner.profile.phone;
  if (portfolio?.contactInfo?.phone) return portfolio.contactInfo.phone;

  // ✅ آخر محاولة: هل صاحب الحساب ده مرتبط بسجل Student؟
  try {
    const student = await Student.findOne({ authUserId: owner._id })
      .select("personalInfo.phone personalInfo.whatsappNumber")
      .lean();

    if (student) {
      return student.personalInfo?.whatsappNumber || student.personalInfo?.phone || null;
    }
  } catch (err) {
    console.warn("⚠️ Could not resolve phone from Student schema:", err.message);
  }

  return null;
}

/**
 * ✅ بناء رسالة البورتفوليو الجاهزة للإرسال
 */
export async function buildPortfolioMessage(templateType, owner, extraVars = {}) {
  const language = owner.language === "en" ? "en" : "ar";
  const content = await getPortfolioTemplateContent(templateType, language);
  const varsMap = await buildVarsMap(language, owner, extraVars);
  return { content: renderTemplate(content, varsMap), language };
}

/**
 * ✅ إرسال رسالة بورتفوليو لصاحبها مباشرة
 * phoneOverride: لو محدد بيتستخدم مباشرة، غير كده بيدوّر تلقائي في كل المصادر
 */
export async function sendPortfolioMessage(templateType, owner, extraVars = {}, phoneOverride = null) {
  const phone = phoneOverride || owner.profile?.phone;
  if (!phone) {
    return { success: false, skipped: true, reason: "no_phone" };
  }

  const { content, language } = await buildPortfolioMessage(templateType, owner, extraVars);

  return wapilotService.sendAndLogUserMessage({
    userId: owner._id,
    phoneNumber: phone,
    messageContent: content,
    messageType: templateType,
    language,
  });
}