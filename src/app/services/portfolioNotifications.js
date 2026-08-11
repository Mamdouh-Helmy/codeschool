// /src/app/services/portfolioNotifications.js
import MessageTemplate from "../models/MessageTemplate";
import TemplateVariable, { getDefaultVariables } from "../models/TemplateVariable";
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
    // fallback للغة التانية لو الأساسية فاضية
    return language === "ar" ? template.contentEn : template.contentAr;
  }

  // ── fallback من TemplateVariable defaults مش موجود هنا، فبنرجع لـ MessageTemplate fallback ──
  const { getFallbackTemplates } = await import("../models/MessageTemplate");
  const fb = getFallbackTemplates()[templateType];
  return fb ? (language === "ar" ? fb.ar : fb.en) : "";
}

// ── بناء map المتغيرات (عام + خاص باليوزر) ──────────────────────────────────
async function buildVarsMap(language, owner, extraVars = {}) {
  const ownerGender = owner.gender === "female" ? "female" : "male";

  // كل المتغيرات العامة (بتاخد في الاعتبار الجنس تلقائياً)
  const varsMap = await TemplateVariable.getVarsMap(language, { ownerGender });

  // ✅ override بالقيم الحقيقية الخاصة باليوزر ده
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
 * ✅ بناء رسالة البورتفوليو الجاهزة للإرسال
 * templateType: "portfolio_inactivity_reminder" | "portfolio_update_broadcast" | "portfolio_contact_form_notification"
 */
export async function buildPortfolioMessage(templateType, owner, extraVars = {}) {
  const language = owner.language === "en" ? "en" : "ar";
  const content = await getPortfolioTemplateContent(templateType, language);
  const varsMap = await buildVarsMap(language, owner, extraVars);
  return { content: renderTemplate(content, varsMap), language };
}

/**
 * ✅ إرسال رسالة بورتفوليو لصاحبها مباشرة
 */
export async function sendPortfolioMessage(templateType, owner, extraVars = {}) {
  const phone = owner.profile?.phone;
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