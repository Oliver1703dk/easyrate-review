import { Response } from 'express';
import type { ApiResponse, PaginatedResponse, ApiError } from '@easyrate/shared';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  error: ApiError,
  statusCode: number = 500
): Response {
  const response: ApiResponse<null> = {
    success: false,
    error,
  };
  return res.status(statusCode).json(response);
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  statusCode: number = 200
): Response {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.hasNextPage,
      hasPrevPage: pagination.hasPrevPage,
    },
  };
  return res.status(statusCode).json(response);
}

export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
