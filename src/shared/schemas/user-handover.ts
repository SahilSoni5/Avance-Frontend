import { z } from 'zod';

export const handoverModeEnum = z.enum(['TO_MANAGER', 'TO_USER', 'SPLIT']);

export const deactivateUserSchema = z.object({
  handover: z
    .discriminatedUnion('mode', [
      z.object({ mode: z.literal('TO_MANAGER') }),
      z.object({ mode: z.literal('TO_USER'), recipientId: z.string().uuid() }),
      z.object({
        mode: z.literal('SPLIT'),
        recipientIds: z.array(z.string().uuid()).min(2).max(3),
      }),
    ])
    .optional(),
});

export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;
export type HandoverInput = NonNullable<DeactivateUserInput['handover']>;
