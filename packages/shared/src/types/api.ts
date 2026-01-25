export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface JwtPayload {
  sub: string; // User ID
  businessId: string;
  email: string;
  role: 'admin' | 'user';
  iat: number;
  exp: number;
}

export interface ApiKeyPayload {
  businessId: string;
  permissions: string[];
  createdAt: number;
}
