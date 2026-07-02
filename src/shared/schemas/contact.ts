import { z } from 'zod';

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  emails: z.array(z.object({ email: z.string().email(), isPrimary: z.boolean().default(false) })).optional(),
  phones: z.array(z.object({ phone: z.string().min(1), isPrimary: z.boolean().default(false) })).optional(),
  address: z.string().max(500).optional(),
  birthday: z.string().datetime().optional(),
  linkedinUrl: z.string().url().optional(),
  twitterUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  leadSource: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  lifecycleStage: z.string().max(50).optional(),
  gdprConsent: z.boolean().optional(),
  doNotContact: z.boolean().optional(),
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  /** Link to a brand by name (creates the brand if missing). Send empty string on update to unlink. */
  accountName: z.string().max(200).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
