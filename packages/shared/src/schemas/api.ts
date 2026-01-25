import { z } from 'zod';

export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const businessIdParamSchema = z.object({
  businessId: z.string().min(1),
});

export type PaginationParamsSchema = z.infer<typeof paginationParamsSchema>;
export type IdParamSchema = z.infer<typeof idParamSchema>;
export type BusinessIdParamSchema = z.infer<typeof businessIdParamSchema>;
