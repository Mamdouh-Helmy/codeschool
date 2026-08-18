// /src/app/utils/generatedFilesPaths.js
//
// ✅ ثابت مشترك لمكان تخزين الصور المولّدة (شهادات) بره مجلد public/.
// السبب إنه في ملف منفصل مش جوه route.js نفسه: Next.js بيسمح فقط
// بـ exports محددة (GET, POST, config...) من ملفات route.js، وبيرفض
// أي export عادي زي الـ constant ده ("is not a valid Route export field").

export const GENERATED_DIR = "/home/codeschool/generated/temp";