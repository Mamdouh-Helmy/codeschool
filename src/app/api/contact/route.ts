import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ContactSubmission, ApiResponse } from "@/lib/types";
import { Collection } from "mongodb";

const COLLECTION_NAME = "contact_submissions";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const contactData = await request.json();
    const db = await getDatabase();
    const collection: Collection<ContactSubmission> = db.collection(COLLECTION_NAME);

    const newSubmission: Omit<ContactSubmission, 'id'> = {
      ...contactData,
      id: crypto.randomUUID(),
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newSubmission as ContactSubmission);

    return NextResponse.json({
      data: { ...newSubmission, id: result.insertedId.toString() },
      source: 'database',
      timestamp: new Date().toISOString(),
      success: true,
      message: 'Contact form submitted successfully'
    } as ApiResponse<ContactSubmission>);

  } catch (error) {
    console.error('Error submitting contact form:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit contact form' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = await getDatabase();
    const collection: Collection<ContactSubmission> = db.collection(COLLECTION_NAME);

    const query: any = {};
    if (status) query.status = status;

    const total = await collection.countDocuments(query);
    const submissions = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      source: 'database',
      timestamp: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch contact submissions' },
      { status: 500 }
    );
  }
}
