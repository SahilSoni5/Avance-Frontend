import { z } from 'zod';

const dateString = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');

export const createDealSchema = z.object({
  name: z.string().min(1).max(200),
  // Decimal(15,2) in the DB → keep within a safe non-negative range.
  value: z.number().nonnegative().max(9_999_999_999_999),
  ownerId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  closeDate: dateString.optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
