import Student from '@/app/models/Student';

/**
 * توليد رقم تسجيل الطالب تلقائيًا
 * التنسيق: STU-YYYYXXXX حيث XXXX هو ترتيب متسلسل
 */
export async function generateEnrollmentNumber() {
  try {
    const currentYear = new Date().getFullYear();
    
    // البحث عن آخر رقم تسجيل لهذا العام (غير محذوف)
    const lastStudent = await Student.findOne({
      enrollmentNumber: new RegExp(`^STU-${currentYear}`),
      isDeleted: false
    }).sort({ enrollmentNumber: -1 });

    let sequence = 1;

    if (lastStudent && lastStudent.enrollmentNumber) {
      const lastNumber = parseInt(lastStudent.enrollmentNumber.slice(-4));
      sequence = lastNumber + 1;
      
      // تأكد من أن التسلسل لا يتجاوز 9999
      if (sequence > 9999) {
        throw new Error('Maximum enrollment numbers reached for this year');
      }
    }

    // التنسيق: STU-YYYYXXXX
    const enrollmentNumber = `STU-${currentYear}${sequence.toString().padStart(4, '0')}`;
    
    console.log(`🔢 Generated enrollment number: ${enrollmentNumber}`);
    
    return enrollmentNumber;
  } catch (error) {
    console.error('❌ Error generating enrollment number:', error);
    
    // Fallback في حالة الخطأ - استخدام الطابع الزمني
    const timestamp = Date.now().toString().slice(-6);
    const fallbackNumber = `STU-EMG-${timestamp}`;
    
    console.log(`⚠️ Using fallback enrollment number: ${fallbackNumber}`);
    
    return fallbackNumber;
  }
}

/**
 * التحقق من أن رقم التسجيل فريد
 */
export async function validateUniqueEnrollmentNumber(enrollmentNumber) {
  try {
    const exists = await Student.findOne({ 
      enrollmentNumber,
      isDeleted: false 
    });
    return !exists;
  } catch (error) {
    console.error('Error validating enrollment number:', error);
    return false;
  }
}

/**
 * الحصول على إحصائيات أرقام التسجيل
 */
export async function getEnrollmentStats() {
  try {
    const currentYear = new Date().getFullYear();
    
    const totalStudents = await Student.countDocuments({ 
      enrollmentNumber: new RegExp(`^STU-${currentYear}`),
      isDeleted: false 
    });
    
    const lastStudent = await Student.findOne({
      enrollmentNumber: new RegExp(`^STU-${currentYear}`),
      isDeleted: false
    }).sort({ enrollmentNumber: -1 });
    
    return {
      year: currentYear,
      totalStudents,
      lastEnrollmentNumber: lastStudent?.enrollmentNumber || 'None',
      nextSequence: lastStudent ? 
        parseInt(lastStudent.enrollmentNumber.slice(-4)) + 1 : 1
    };
  } catch (error) {
    console.error('Error getting enrollment stats:', error);
    return null;
  }
}