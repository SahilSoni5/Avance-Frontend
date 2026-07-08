import type { QueryClient } from '@tanstack/react-query';

/** Keep Contacts and Brand POC lists in sync after create/update. */
export function invalidateContactBrandSync(
  queryClient: QueryClient,
  opts?: { accountId?: string | null; contactId?: string }
) {
  queryClient.invalidateQueries({ queryKey: ['contacts'] });
  queryClient.invalidateQueries({ queryKey: ['brands'] });
  if (opts?.accountId) {
    queryClient.invalidateQueries({ queryKey: ['brand-pocs', opts.accountId] });
    queryClient.invalidateQueries({ queryKey: ['brand-detail', opts.accountId] });
    queryClient.invalidateQueries({ queryKey: ['brand-updates', opts.accountId] });
    queryClient.invalidateQueries({ queryKey: ['brand-pipeline', opts.accountId] });
  }
  if (opts?.contactId) {
    queryClient.invalidateQueries({ queryKey: ['contact-detail', opts.contactId] });
    queryClient.invalidateQueries({ queryKey: ['contact', opts.contactId] });
  }
}
