// src/utils/urlUtils.ts

export function getApiUrl(path: string = ''): string {
  // الحصول على الـ base URL من البيئة
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!baseUrl) {
    console.error('NEXT_PUBLIC_API_URL is not defined');
    return '';
  }

  try {
    // تنظيف الـ base URL وإزالة أي / زائدة في النهاية
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    
    // تنظيف الـ path وإزالة أي / زائدة في البداية
    const cleanPath = path.replace(/^\/+/, '');
    
    // بناء الـ URL الكامل
    const fullUrl = cleanPath ? `${cleanBaseUrl}/${cleanPath}` : cleanBaseUrl;
    
    // التحقق من صحة الـ URL
    new URL(fullUrl);
    return fullUrl;
  } catch (error) {
    console.error('Invalid URL configuration:', error);
    return '';
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}