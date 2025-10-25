import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { FAQ, ApiResponse, PaginatedResponse } from "@/lib/types";
import { FALLBACK_FAQS } from "@/lib/fallbackData/faq";

const COLLECTION_NAME = "faqs";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const db = await getDatabase();
    const collection = db.collection<FAQ>(COLLECTION_NAME);

    // Build query
    const query: any = { isActive: true };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } }
      ];
    }

    const faqs = await collection
      .find(query)
      .sort({ category: 1, createdAt: 1 })
      .toArray();

    if (faqs.length === 0) {
      return NextResponse.json({
        data: FALLBACK_FAQS,
        source: 'fallback',
        timestamp: new Date().toISOString(),
        success: true,
        message: 'Using fallback data'
      } as ApiResponse<FAQ[]>);
    }

    return NextResponse.json({
      data: faqs,
      source: 'database',
      timestamp: new Date().toISOString(),
      success: true
    } as ApiResponse<FAQ[]>);
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    
    return NextResponse.json({
      data: FALLBACK_FAQS,
      source: 'fallback',
      timestamp: new Date().toISOString(),
      success: true,
      message: 'Using fallback data due to error'
    } as ApiResponse<FAQ[]>);
  }
}

export async function POST(request: NextRequest) {
  try {
    const faqData = await request.json();
    const db = await getDatabase();
    const collection = db.collection<FAQ>(COLLECTION_NAME);

    const newFAQ: Omit<FAQ, 'id'> = {
      ...faqData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    const result = await collection.insertOne(newFAQ as FAQ);
    
    return NextResponse.json({
      data: { ...newFAQ, id: result.insertedId.toString() },
      source: 'database',
      timestamp: new Date().toISOString(),
      success: true,
      message: 'FAQ created successfully'
    } as ApiResponse<FAQ>);
  } catch (error) {
    console.error('Error creating FAQ:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create FAQ' },
      { status: 500 }
    );
  }
}
