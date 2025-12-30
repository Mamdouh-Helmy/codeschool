import { NextResponse } from 'next/server';
import { wapilotService } from '@/app/services/wapilot-service';

export async function GET() {
  try {
    const status = await wapilotService.getServiceStatus();
    
    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}