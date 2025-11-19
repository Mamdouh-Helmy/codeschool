import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CurriculumStage from '../../../models/CurriculumStage';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid stage ID' },
        { status: 400 }
      );
    }

    const stage = await CurriculumStage.findById(id).populate('age_category_id');
    
    if (!stage) {
      return NextResponse.json(
        { success: false, message: 'Stage not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: stage
    });
  } catch (error) {
    console.error('Error fetching curriculum stage:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch curriculum stage' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid stage ID' },
        { status: 400 }
      );
    }

    const updatedStage = await CurriculumStage.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    );

    if (!updatedStage) {
      return NextResponse.json(
        { success: false, message: 'Stage not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedStage,
      message: 'Stage updated successfully'
    });
  } catch (error) {
    console.error('Error updating curriculum stage:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update stage' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid stage ID' },
        { status: 400 }
      );
    }

    const deletedStage = await CurriculumStage.findByIdAndDelete(id);

    if (!deletedStage) {
      return NextResponse.json(
        { success: false, message: 'Stage not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Stage deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting curriculum stage:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete stage' },
      { status: 500 }
    );
  }
}