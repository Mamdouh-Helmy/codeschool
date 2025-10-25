import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const revalidate = 0;

export async function GET() {
  try {
    // Test MongoDB connection
    const db = await getDatabase();
    await db.admin().ping();
    
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        api: "operational"
      },
      version: "1.0.0"
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: "disconnected",
        api: "operational"
      },
      version: "1.0.0",
      error: "Database connection failed"
    }, { status: 503 });
  }
}
