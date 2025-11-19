// app/api/categories/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AgeCategory from '../../models/AgeCategory';

export async function GET() {
  try {
    await connectDB();
    const categories = await AgeCategory.find({ is_active: true }).sort({ order: 1 });
    
    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const requiredFields = ['age_range', 'name_en', 'name_ar', 'description_en', 'description_ar', 'order'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // التحقق من وجود age_range بالشكل الصحيح
    if (!body.age_range.en || !body.age_range.ar) {
      return NextResponse.json(
        { success: false, message: 'Age range must have both English and Arabic versions' },
        { status: 400 }
      );
    }

    // التحقق إذا كانت الفئة موجودة مسبقاً
    const existingCategory = await AgeCategory.findOne({ 
      $or: [
        { 'age_range.en': body.age_range.en },
        { 'age_range.ar': body.age_range.ar }
      ]
    });

    if (existingCategory) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Category with age range '${body.age_range.en}' or '${body.age_range.ar}' already exists` 
        },
        { status: 409 } 
      );
    }

    const newCategory = await AgeCategory.create(body);
    
    return NextResponse.json({
      success: true,
      data: newCategory,
      message: 'Category created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    
    // معالجة خطأ الـ duplicate key بشكل خاص
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Category with this age range already exists' 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to create category' },
      { status: 500 }
    );
  }
}