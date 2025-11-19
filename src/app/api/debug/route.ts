// src/app/api/debug/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CurriculumStage from '../../models/CurriculumStage';
import AgeCategory from '../../models/AgeCategory';

interface StageData {
  _id: string;
  title_en: string;
  title_ar: string;
  age_range: {
    en: string;
    ar: string;
  };
  platform: string;
  language_type: string;
  order_index: number;
}

interface CategoryData {
  _id: string;
  age_range: {
    en: string;
    ar: string;
  };
  name_en: string;
  name_ar: string;
  order: number;
}

export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'stages') {
      const stages = await CurriculumStage.find({})
        .populate('age_category_id')
        .sort({ order_index: 1 });
      
      console.log('🔍 All stages in DB:', JSON.stringify(stages, null, 2));
      
      const stagesData: StageData[] = stages.map(stage => ({
        _id: stage._id.toString(),
        title_en: stage.title_en,
        title_ar: stage.title_ar,
        age_range: stage.age_range,
        platform: stage.platform,
        language_type: stage.language_type,
        order_index: stage.order_index
      }));
      
      return NextResponse.json({
        success: true,
        count: stages.length,
        stages: stagesData
      });
    }
    
    if (action === 'categories') {
      const categories = await AgeCategory.find({});
      
      // console.log('🔍 All categories in DB:', JSON.stringify(categories, null, 2));
      
      const categoriesData: CategoryData[] = categories.map(cat => ({
        _id: cat._id.toString(),
        age_range: cat.age_range,
        name_en: cat.name_en,
        name_ar: cat.name_ar,
        order: cat.order
      }));
      
      return NextResponse.json({
        success: true,
        count: categories.length,
        categories: categoriesData
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