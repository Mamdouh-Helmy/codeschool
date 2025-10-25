import { useState, useEffect, useCallback } from 'react';
import { ApiResponse, PaginatedResponse } from '@/lib/types';
import { apiClient, handleApiError } from '@/lib/api-client';

interface UseApiDataOptions<T> {
  fallbackData?: T;
  enabled?: boolean;
  refetchInterval?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

interface UseApiDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  source: 'database' | 'fallback' | null;
  lastUpdated: string | null;
}

export function useApiData<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
  options: UseApiDataOptions<T> = {}
): UseApiDataReturn<T> {
  const {
    fallbackData,
    enabled = true,
    refetchInterval,
    onError,
    onSuccess
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'database' | 'fallback' | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getWithFallback<T>(
        endpoint,
        params,
        fallbackData
      );

      // Handle both ApiResponse and PaginatedResponse
      const responseData = 'data' in response ? response.data : response;
      const responseSource = 'source' in response ? response.source : 'database';
      const responseTimestamp = 'timestamp' in response ? response.timestamp : new Date().toISOString();

      setData(responseData as T);
      setSource(responseSource);
      setLastUpdated(responseTimestamp);
      
      onSuccess?.(responseData as T);
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, enabled, fallbackData, onError, onSuccess]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    source,
    lastUpdated
  };
}

// Specialized hooks for different data types
export function useCourses(params?: Record<string, string | number | boolean>) {
  return useApiData('/api/courses', params);
}

export function useEvents(params?: Record<string, string | number | boolean>) {
  return useApiData('/api/events', params);
}

export function useTestimonials(params?: Record<string, string | number | boolean>) {
  return useApiData('/api/testimonials', params);
}

export function useBlogPosts(params?: any) {
  return useApiData('/api/blogs', params);
}

export function useProjects(params?: Record<string, string | number | boolean>) {
  return useApiData('/api/projects', params);
}

export function useFAQs(params?: Record<string, string | number | boolean>) {
  return useApiData('/api/faq', params);
}

// Hook for dashboard data
export function useDashboardData() {
  return useApiData('/api/dashboard');
}

// Hook for schedule data
export function useScheduleData() {
  return useApiData('/api/schedules');
}

// Hook for active webinar
export function useActiveWebinar() {
  return useApiData('/api/webinars/active');
}

// Hook for pricing plans
export function usePricing() {
  return useApiData('/api/pricing');
}

// Hook for subscriptions
export function useSubscriptions() {
  return useApiData('/api/subscriptions');
}



// Hook for contact form submission
export function useContactSubmission() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitContact = useCallback(async (data: any) => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await apiClient.post('/api/contact', data);
      setSuccess(true);
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    submitContact,
    submitting,
    error,
    success
  };
}

// Hook for newsletter subscription
export function useNewsletterSubscription() {
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const subscribe = useCallback(async (email: string) => {
    setSubscribing(true);
    setError(null);
    setSuccess(false);

    try {
      await apiClient.post('/api/newsletter', { email });
      setSuccess(true);
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
    } finally {
      setSubscribing(false);
    }
  }, []);

  const unsubscribe = useCallback(async (email: string) => {
    setSubscribing(true);
    setError(null);
    setSuccess(false);

    try {
      await apiClient.delete(`/api/newsletter?email=${encodeURIComponent(email)}`);
      setSuccess(true);
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
    } finally {
      setSubscribing(false);
    }
  }, []);

  return {
    subscribe,
    unsubscribe,
    subscribing,
    error,
    success
  };
}
