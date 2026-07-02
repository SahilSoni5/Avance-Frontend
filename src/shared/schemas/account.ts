import { z } from 'zod';

export const pocInputSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobTitle: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
});

export const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  ownerId: z.string().uuid().optional(),
  pocs: z.array(pocInputSchema).optional(),
});

export const addAccountPocsSchema = z.object({
  pocs: z.array(pocInputSchema).min(1),
});

export type PocInput = z.infer<typeof pocInputSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type AddAccountPocsInput = z.infer<typeof addAccountPocsSchema>;
