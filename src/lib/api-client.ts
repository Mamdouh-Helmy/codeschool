import { ApiResponse, PaginatedResponse } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // ✅ تحديد الرابط الأساسي تلقائيًا حسب البيئة
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (typeof window !== 'undefined') {
      // في المتصفح
      this.baseUrl = window.location.origin;
    } else {
      // في السيرفر (Next.js SSR)
      this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw new ApiError(
        `API request failed: ${response.statusText}`,
        response.status,
        response
      );
    }
    return response.json();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0
      );
    }
  }

  // ✅ GET
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return this.request<T>(url.pathname + url.search);
  }

  // ✅ POST
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // ✅ PUT
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // ✅ DELETE
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // ✅ with fallback
  async getWithFallback<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    fallbackData?: T
  ): Promise<ApiResponse<T> | PaginatedResponse<T>> {
    try {
      const response = await this.get<ApiResponse<T> | PaginatedResponse<T>>(endpoint, params);
      return response;
    } catch (error) {
      console.warn(`API request failed for ${endpoint}, using fallback data:`, error);
      if (fallbackData) {
        return {
          data: fallbackData,
          source: 'fallback',
          timestamp: new Date().toISOString(),
          success: true,
          message: 'Using fallback data due to API error'
        } as ApiResponse<T>;
      }
      throw error;
    }
  }

  // ✅ Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }
}

// ✅ إنشاء instance جاهز
export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
);

// ✅ دوال مساعدة
export async function fetchWithFallback<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
  fallbackData?: T
): Promise<ApiResponse<T> | PaginatedResponse<T>> {
  return apiClient.getWithFallback(endpoint, params, fallbackData);
}

export function handleApiError(error: unknown): { message: string; status: number } {
  if (error instanceof ApiError) {
    return { message: error.message, status: error.status };
  }
  
  return { 
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    status: 0
  };
}
