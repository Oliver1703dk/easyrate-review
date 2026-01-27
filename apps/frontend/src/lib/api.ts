import { ERROR_MESSAGES } from '@easyrate/shared';
import type {
  LandingPageResponse,
  SubmitReviewRequest,
  SubmitReviewResponse,
  AuthResponse,
  LoginInput,
  RegisterInput,
  Review,
  Business,
  UpdateBusinessInput,
  IntegrationConfig,
  ReviewStats,
  NotificationStats,
  PaginatedResponse,
  PresignedUploadRequest,
  PresignedUploadResponse,
  PresignedDownloadResponse,
  CustomerIdentifier,
  GdprExportResponse,
  GdprDeletionResponse,
  RetentionPolicyResponse,
} from '@easyrate/shared';

const API_BASE = '/api/v1';
const TOKEN_KEY = 'easyrate_token';

interface ApiError {
  message: string;
  code?: string;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    // Add auth header if token exists
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Merge additional headers if provided
    if (options.headers) {
      const additionalHeaders =
        options.headers instanceof Headers
          ? options.headers
          : new Headers(options.headers as HeadersInit);
      additionalHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const json = await response.json() as { success: boolean; data?: T; error?: ApiError };

      if (!response.ok) {
        throw new Error(json.error?.message ?? ERROR_MESSAGES.generic);
      }

      return json.data as T;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(ERROR_MESSAGES.networkError);
      }
      throw error;
    }
  }

  // ============ Landing Page ============

  async getLandingPageData(token: string): Promise<LandingPageResponse> {
    return this.request<LandingPageResponse>(`/r/${token}`);
  }

  async submitReview(token: string, data: SubmitReviewRequest, isTest?: boolean): Promise<SubmitReviewResponse> {
    const queryParams = isTest ? '?isTest=true' : '';
    return this.request<SubmitReviewResponse>(`/r/${token}${queryParams}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ Auth ============

  async login(input: LoginInput): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ============ Reviews ============

  async getReviews(params?: {
    page?: number;
    pageSize?: number;
    rating?: number | number[];
    sourcePlatform?: string;
    isPublic?: boolean;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }): Promise<PaginatedResponse<Review>> {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.page) searchParams.set('page', String(params.page));
      if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
      if (params.rating) {
        const ratings = Array.isArray(params.rating) ? params.rating : [params.rating];
        ratings.forEach((r) => searchParams.append('rating', String(r)));
      }
      if (params.sourcePlatform) searchParams.set('sourcePlatform', params.sourcePlatform);
      if (params.isPublic !== undefined) searchParams.set('isPublic', String(params.isPublic));
      if (params.fromDate) searchParams.set('fromDate', params.fromDate);
      if (params.toDate) searchParams.set('toDate', params.toDate);
      if (params.search) searchParams.set('search', params.search);
    }
    const query = searchParams.toString();
    return this.request<PaginatedResponse<Review>>(`/reviews${query ? `?${query}` : ''}`);
  }

  async getReviewStats(): Promise<ReviewStats> {
    return this.request<ReviewStats>('/reviews/stats');
  }

  // ============ Notifications ============

  async getNotificationStats(): Promise<NotificationStats> {
    return this.request<NotificationStats>('/notifications/stats');
  }

  // ============ Business ============

  async getCurrentBusiness(): Promise<Business> {
    return this.request<Business>('/businesses/me');
  }

  async updateCurrentBusiness(data: UpdateBusinessInput): Promise<Business> {
    return this.request<Business>('/businesses/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getIntegrations(): Promise<{ integrations: IntegrationConfig[] }> {
    return this.request<{ integrations: IntegrationConfig[] }>('/businesses/me/integrations');
  }

  async updateIntegration(
    platform: string,
    config: Partial<IntegrationConfig>
  ): Promise<IntegrationConfig> {
    return this.request<IntegrationConfig>(`/businesses/me/integrations/${platform}`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
  }

  async testIntegration(platform: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/businesses/me/integrations/${platform}/test`, {
      method: 'POST',
    });
  }

  // ============ Uploads ============

  async getUploadUrl(
    businessId: string,
    input: PresignedUploadRequest
  ): Promise<PresignedUploadResponse> {
    return this.request<PresignedUploadResponse>('/uploads/presigned', {
      method: 'POST',
      body: JSON.stringify({
        businessId,
        reviewId: 'pending',
        ...input,
      }),
    });
  }

  async getDownloadUrl(fileKey: string): Promise<PresignedDownloadResponse> {
    return this.request<PresignedDownloadResponse>('/uploads/download-url', {
      method: 'POST',
      body: JSON.stringify({ fileKey }),
    });
  }

  // ============ GDPR ============

  async exportBusinessData(): Promise<GdprExportResponse> {
    return this.request<GdprExportResponse>('/gdpr/export', {
      method: 'POST',
    });
  }

  async exportCustomerData(identifier: CustomerIdentifier): Promise<GdprExportResponse> {
    return this.request<GdprExportResponse>('/gdpr/export/customer', {
      method: 'POST',
      body: JSON.stringify(identifier),
    });
  }

  async deleteCustomerData(identifier: CustomerIdentifier): Promise<GdprDeletionResponse> {
    return this.request<GdprDeletionResponse>('/gdpr/customer', {
      method: 'DELETE',
      body: JSON.stringify(identifier),
    });
  }

  async applyRetentionPolicy(retentionDays: number): Promise<RetentionPolicyResponse> {
    return this.request<RetentionPolicyResponse>('/gdpr/retention/apply', {
      method: 'POST',
      body: JSON.stringify({ retentionDays }),
    });
  }

  async deleteAccount(): Promise<GdprDeletionResponse> {
    return this.request<GdprDeletionResponse>('/gdpr/account', {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
