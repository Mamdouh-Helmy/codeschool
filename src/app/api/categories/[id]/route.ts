// app/api/categories/[id]/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AgeCategory from '../../../models/AgeCategory';
import mongoose from 'mongoose';

interface Params {
  id: string;
}

interface AgeRange {
  en: string;
  ar: string;
}

interface CategoryBody {
  age_range?: AgeRange;
  description?: {
    en?: string;
    ar?: string;
  };
  color?: string;
  order?: number;
  status?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const category = await AgeCategory.findById(id);
    
    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body: CategoryBody = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // التحقق من وجود age_range بالشكل الصحيح إذا تم إرسالها
    if (body.age_range && (!body.age_range.en || !body.age_range.ar)) {
      return NextResponse.json(
        { success: false, message: 'Age range must have both English and Arabic versions' },
        { status: 400 }
      );
    }

    // التحقق من عدم التكرار مع فئات أخرى
    if (body.age_range) {
      const existingCategory = await AgeCategory.findOne({
        _id: { $ne: id },
        $or: [
          { 'age_range.en': body.age_range.en },
          { 'age_range.ar': body.age_range.ar }
        ]
      });

      if (existingCategory) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Another category with age range '${body.age_range.en}' or '${body.age_range.ar}' already exists` 
          },
          { status: 409 }
        );
      }
    }

    const updatedCategory = await AgeCategory.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Another category with this age range already exists' 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const deletedCategory = await AgeCategory.findByIdAndDelete(id);

    if (!deletedCategory) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete category' },
      { status: 500 }
    );
  }
}