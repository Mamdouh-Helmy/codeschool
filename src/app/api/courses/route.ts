import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { Course, ApiResponse, PaginatedResponse } from "@/lib/types";
import { Collection } from "mongodb";
import { FALLBACK_COURSES } from "@/lib/fallbackData/courses";

const COLLECTION_NAME = "courses";

export const revalidate = 60; // Revalidate every minute

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const db = await getDatabase();
    const collection: Collection<Course> = db.collection(COLLECTION_NAME);

    const query: any = { isActive: true };
    if (category) query.category = category;
    if (level) query.level = level;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const total = await collection.countDocuments(query);
    const courses = await collection
      .find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    if (courses.length === 0) {
      return NextResponse.json({
        data: FALLBACK_COURSES.slice(0, limit),
        pagination: {
          page: 1,
          limit,
          total: FALLBACK_COURSES.length,
          totalPages: Math.ceil(FALLBACK_COURSES.length / limit),
          hasNext: false,
          hasPrev: false
        },
        source: 'fallback',
        timestamp: new Date().toISOString(),
        success: true,
        message: 'Using fallback data'
      } as PaginatedResponse<Course>);
    }

    const response: PaginatedResponse<Course> = {
      data: courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      source: 'database',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({
      data: FALLBACK_COURSES,
      pagination: {
        page: 1,
        limit: 10,
        total: FALLBACK_COURSES.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      source: 'fallback',
      timestamp: new Date().toISOString()
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const courseData = await request.json();
    const db = await getDatabase();
    const collection: Collection<Course> = db.collection(COLLECTION_NAME);

    const newCourse: Omit<Course, 'id'> = {
      ...courseData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      enrollmentCount: 0,
      rating: 0,
      reviewCount: 0
    };

    const result = await collection.insertOne(newCourse as Course);

    return NextResponse.json({
      data: { ...newCourse, id: result.insertedId.toString() },
      source: 'database',
      timestamp: new Date().toISOString(),
      success: true,
      message: 'Course created successfully'
    } as ApiResponse<Course>);

  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create course' },
      { status: 500 }
    );
  }
}
