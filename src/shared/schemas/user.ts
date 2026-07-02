import { z } from 'zod';
import { RoleEnum } from './auth';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  timezone: z.string().max(50).optional(),
  avatar: z.string().max(500).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: RoleEnum,
  reportsToId: z.string().uuid().nullable().optional(),
  phone: z.string().max(20).optional(),
  timezone: z.string().max(50).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  timezone: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
  reportsToId: z.string().uuid().nullable().optional(),
  /** Admin-only fields */
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(['ADMIN', 'BOSS', 'MANAGER', 'EMPLOYEE', 'INTERN']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
