import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CurriculumStage from '../../../models/CurriculumStage';

export async function GET() {
  try {
    await connectDB();
    const stages = await CurriculumStage.find({})
      .populate('age_category_id')
      .sort({ order_index: 1 });
    
    return NextResponse.json({
      success: true,
      data: stages
    });
  } catch (error) {
    console.error('Error fetching curriculum stages:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch curriculum stages' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    // التحقق من الحقول المطلوبة
    const requiredFields = ['age_range', 'title_en', 'title_ar', 'platform', 'language_type', 'duration', 'lessons_count', 'projects_count', 'description_en', 'description_ar', 'order_index'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const newStage = await CurriculumStage.create(body);
    
    return NextResponse.json({
      success: true,
      data: newStage,
      message: 'Curriculum stage created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating curriculum stage:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create curriculum stage' },
      { status: 500 }
    );
  }
}