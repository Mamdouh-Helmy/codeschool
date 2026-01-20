// app/api/marketing-automation/whatsapp/route.js
import { NextResponse } from "next/server";
import { wapilotService } from "../../../services/wapilot-service";

export async function POST(req) {
  try {
    const body = await req.json();
    const { studentId, whatsappNumber, message, actionId } = body;

    // إرسال الرسالة عبر WhatsApp
    const result = await wapilotService.sendAndLogMessage({
      studentId,
      phoneNumber: whatsappNumber,
      messageContent: message,
      messageType: 'custom_upsell_offer',
      language: 'ar',
      metadata: {
        studentId,
        actionId,
        offerType: 'manual_upsell',
        sentVia: 'marketing_upsell_page'
      }
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Error sending WhatsApp:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}