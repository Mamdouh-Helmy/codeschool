// src/app/api/debug/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CurriculumStage from '../../models/CurriculumStage';
import AgeCategory from '../../models/AgeCategory';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'stages') {
      const stages = await CurriculumStage.find({})
        .populate('age_category_id')
        .sort({ order_index: 1 });
      
      console.log('🔍 All stages in DB:', JSON.stringify(stages, null, 2));
      
      return NextResponse.json({
        success: true,
        count: stages.length,
        stages: stages.map(stage => ({
          _id: stage._id,
          title_en: stage.title_en,
          title_ar: stage.title_ar,
          age_range: stage.age_range,
          platform: stage.platform,
          language_type: stage.language_type,
          order_index: stage.order_index
        }))
      });
    }
    
    if (action === 'categories') {
      const categories = await AgeCategory.find({});
      
    //   console.log('🔍 All categories in DB:', JSON.stringify(categories, null, 2));
      
      return NextResponse.json({
        success: true,
        count: categories.length,
        categories: categories.map(cat => ({
          _id: cat._id,
          age_range: cat.age_range,
          name_en: cat.name_en,
          name_ar: cat.name_ar,
          order: cat.order
        }))
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Specify action: stages or categories'
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json(
      { success: false, message: 'Debug failed' },
      { status: 500 }
    );
  }
}