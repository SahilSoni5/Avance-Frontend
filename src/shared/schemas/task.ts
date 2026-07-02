import { z } from 'zod';

const dateString = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');

export const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  // Optional: when omitted, the API assigns the task to the current user.
  assignedToId: z.string().uuid().optional(),
  dueDate: dateString.optional(),
  priority: taskPriorityEnum.optional(),
  type: z.string().max(50).optional(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
