// /src/app/api/admin/seed-offline/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TemplateVariable from "../../../models/TemplateVariable";
import MessageTemplate from "../../../models/MessageTemplate";
import WhatsAppTemplateInstructor from "../../../models/WhatsAppTemplateInstructor";
import {
  getFallbackTemplates,
} from "../../../models/MessageTemplate";
import {
  getInstructorFallbackTemplates,
} from "../../../models/WhatsAppTemplateInstructor";

const ADMIN_SECRET = process.env.ADMIN_SEED_SECRET || "seed-offline-2024";

// ═══════════════════════════════════════════════════════════
// ✅ نفس الدالة بتشتغل مع GET و POST — تفتحها من المتصفح عادي
// ═══════════════════════════════════════════════════════════
async function handleSeed(req) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — لازم ?secret=..." },
        { status: 401 },
      );
    }

    await connectDB();

    const result = {
      variables: { created: [], skipped: [] },
      messageTemplates: { created: [], skipped: [] },
      instructorTemplates: { created: [], skipped: [] },
    };

    // ═══════════════════════════════════════════════════════════
    // 1️⃣ Seed TemplateVariable — Offline Location Variables
    // ═══════════════════════════════════════════════════════════
    const TemplateVariableModule = await import("../../../models/TemplateVariable");
    const allDefaults = TemplateVariableModule.getDefaultVariables();

    const offlineVarKeys = ["placeName", "address", "mapsLink"];

    for (const key of offlineVarKeys) {
      const varDef = allDefaults.find((v) => v.key === key);
      if (!varDef) continue;

      const exists = await TemplateVariable.findOne({ key });
      if (exists) {
        result.variables.skipped.push(key);
        continue;
      }
      await TemplateVariable.create(varDef);
      result.variables.created.push(key);
    }

    // ═══════════════════════════════════════════════════════════
    // 2️⃣ Seed MessageTemplate — Offline Templates
    // ═══════════════════════════════════════════════════════════
    const fallbacks = getFallbackTemplates();
    const offlineTemplateTypes = [
      "reminder_24h_offline_student",
      "reminder_24h_offline_guardian",
      "reminder_30min_offline_student",
      "reminder_30min_offline_guardian",
      "pre_attendance_ping_student",
      "pre_attendance_ping_guardian",
    ];

    for (const type of offlineTemplateTypes) {
      const existing = await MessageTemplate.findOne({
        templateType: type,
        isDefault: true,
      });
      if (existing) {
        result.messageTemplates.skipped.push(type);
        continue;
      }

      const fb = fallbacks[type];
      if (!fb) continue;

      const recipientType = type.includes("student") ? "student" : "guardian";

      await MessageTemplate.create({
        templateType: type,
        recipientType,
        name: type,
        contentAr: fb.ar,
        contentEn: fb.en,
        variables: fb.variables || [],
        description: `Offline flow template — ${type}`,
        isDefault: true,
        isActive: true,
      });
      result.messageTemplates.created.push(type);
    }

    // ═══════════════════════════════════════════════════════════
    // 3️⃣ Seed WhatsAppTemplateInstructor — Offline Instructor
    // ═══════════════════════════════════════════════════════════
    const instructorFallbacks = getInstructorFallbackTemplates();
    const instructorTypes = [
      "reminder_24h_offline",
      "reminder_30min_offline",
      "pre_attendance_ping",
    ];

    for (const type of instructorTypes) {
      const existing = await WhatsAppTemplateInstructor.findOne({
        templateType: type,
        isDefault: true,
      });
      if (existing) {
        result.instructorTemplates.skipped.push(type);
        continue;
      }

      const fb = instructorFallbacks[type];
      if (!fb) continue;

      await WhatsAppTemplateInstructor.create({
        templateType: type,
        name: fb.name || type,
        contentAr: fb.ar,
        contentEn: fb.en,
        description: fb.description || "",
        variables: fb.variables || [],
        isDefault: true,
        isActive: true,
      });
      result.instructorTemplates.created.push(type);
    }

    return NextResponse.json({
      success: true,
      message: "✅ Offline seed completed",
      result,
      hint: "روح للـ UI واعمل Hard Refresh (Ctrl+Shift+R) عشان تشوف الجديد",
    });
  } catch (err) {
    console.error("❌ Seed error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

// ✅ GET — تقدر تفتحه من المتصفح عادي
export async function GET(req) {
  return handleSeed(req);
}

// ✅ POST — للاستخدام من curl أو أي client
export async function POST(req) {
  return handleSeed(req);
}