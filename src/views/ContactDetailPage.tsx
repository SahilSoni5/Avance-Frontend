'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, UserPlus, GitMerge } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateTimeIST } from '../lib/locale';
import { ModulePage, LoadingRows, ErrorMessage, formatCurrency, StatusBadge, OwnerCell } from '../components/ModulePage';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button, Dialog, SectionCard, Badge } from '../components/ui';
import { ContactFormDialog, type ContactFormValues } from '../components/ContactFormDialog';
import { RecordForm } from '../components/RecordForm';
import { invalidateContactBrandSync } from '../lib/query-invalidation';

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  status: string | null;
  owner: { id: string; firstName: string; lastName: string; role?: string };
  account: { id: string; name: string } | null;
  emails: { email: string; isPrimary: boolean }[];
  phones: { phone: string }[];
  touchPoints?: Array<{
    user: { id: string; firstName: string; lastName: string; role: string };
    lastContactAt: string;
    types: string[];
    isCurrent: boolean;
  }>;
  pipeline?: {
    activeDeals: Array<{ id: string; name?: string; value?: string; stage?: string; owner: { firstName: string; lastName: string }; visible: boolean }>;
    closedDeals: Array<{ id: string; name?: string; value?: string; stage?: string; owner: { firstName: string; lastName: string }; visible: boolean }>;
  };
  activities: Array<{ id: string; type: string; description: string | null; subject?: string; createdAt: string }>;
  notes: Array<{ id: string; content: string; createdAt: string; user: { firstName: string; lastName: string } }>;
}

interface DuplicateGroup {
  primary: { id: string; firstName: string; lastName: string };
  duplicates: Array<{ id: string; firstName: string; lastName: string }>;
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => apiFetch<{ data: ContactDetail }>(`/contacts/${id}`),
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => apiFetch<{ data: Array<{ id: string; firstName: string; lastName: string }> }>('/organizations/members'),
  });

  const { data: duplicates } = useQuery({
    queryKey: ['contact-duplicates'],
    queryFn: () => apiFetch<{ data: DuplicateGroup[] }>('/contacts/duplicates'),
  });

  const contact = data?.data;

  const updateMutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      apiFetch(`/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          jobTitle: values.jobTitle || undefined,
          status: values.status,
          ...(values.accountId ? { accountId: values.accountId } : {}),
        }),
      }),
    onSuccess: (_data, values) => {
      const prevAccountId = contact?.account?.id;
      invalidateContactBrandSync(queryClient, { contactId: id, accountId: values.accountId || undefined });
      if (prevAccountId && prevAccountId !== values.accountId) {
        invalidateContactBrandSync(queryClient, { accountId: prevAccountId });
      }
      setEditOpen(false);
    },
  });

  const reassignMutation = useMutation({
    mutationFn: (ownerId: string) =>
      apiFetch(`/contacts/${id}/reassign`, { method: 'POST', body: JSON.stringify({ ownerId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] });
      setReassignOpen(false);
    },
  });

  const mergeMutation = useMutation({
    mutationFn: ({ primaryId, duplicateIds }: { primaryId: string; duplicateIds: string[] }) =>
      apiFetch('/contacts/merge', { method: 'POST', body: JSON.stringify({ primaryId, duplicateIds }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-duplicates'] }),
  });

  const myDuplicates = duplicates?.data?.find((g) =>
    g.primary.id === id || g.duplicates.some((d) => d.id === id)
  );

  if (isLoading) return <ModulePage title="Contact"><LoadingRows /></ModulePage>;
  if (error || !contact) return <ModulePage title="Contact"><ErrorMessage error={error ?? 'Not found'} /></ModulePage>;

  return (
    <ModulePage title={`${contact.firstName} ${contact.lastName}`} description={contact.jobTitle ?? undefined}>
      <Breadcrumbs items={[{ label: 'Contacts', href: '/contacts' }, { label: `${contact.firstName} ${contact.lastName}` }]} />

      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
        <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)}>
          <UserPlus className="w-3.5 h-3.5 mr-1" /> Reassign
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Timeline">
            <div className="space-y-4 -mt-2">
              {contact.activities?.length ? contact.activities.map((a) => (
                <div key={a.id} className="flex gap-3 border-l-2 border-primary/30 pl-4">
                  <div>
                    <p className="text-sm font-medium capitalize">{a.type.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{a.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDateTimeIST(a.createdAt)}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">No activity yet</p>}
            </div>
          </SectionCard>

          <SectionCard title="Notes">
            <div className="space-y-3 -mt-2">
              {contact.notes?.length ? contact.notes.map((n) => (
                <div key={n.id} className="p-3 rounded-lg bg-muted dark:bg-slate-800/50">
                  <p className="text-sm">{n.content}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {n.user.firstName} {n.user.lastName} · {formatDateTimeIST(n.createdAt)}
                  </p>
                </div>
              )) : <p className="text-sm text-slate-500">No notes</p>}
            </div>
          </SectionCard>

          <SectionCard title="Deals">
            <div className="space-y-2 -mt-2">
              {[...(contact.pipeline?.activeDeals ?? []), ...(contact.pipeline?.closedDeals ?? [])].length ? (
                [...(contact.pipeline?.activeDeals ?? []), ...(contact.pipeline?.closedDeals ?? [])].map((deal) =>
                  deal.visible ? (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted dark:hover:bg-slate-800/50"
                    >
                      <span className="font-medium text-sm">{deal.name}</span>
                      <div className="flex items-center gap-2">
                        {deal.value != null && <span className="text-sm text-slate-500">{formatCurrency(deal.value)}</span>}
                        {deal.stage && <Badge>{deal.stage}</Badge>}
                      </div>
                    </Link>
                  ) : (
                    <div key={deal.id} className="p-3 rounded-lg bg-muted/50 text-sm text-slate-500 italic">
                      Deal handled by {deal.owner.firstName} {deal.owner.lastName}
                    </div>
                  )
                )
              ) : <p className="text-sm text-slate-500">No linked deals</p>}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Details">
            <dl className="space-y-3 text-sm -mt-2">
              <div><dt className="text-slate-500">Status</dt><dd><StatusBadge status={contact.status} /></dd></div>
              <div><dt className="text-slate-500">Owner</dt><dd><OwnerCell owner={contact.owner} /></dd></div>
              <div><dt className="text-slate-500">Email</dt><dd>{contact.emails[0]?.email ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Phone</dt><dd>{contact.phones[0]?.phone ?? '—'}</dd></div>
              {contact.account && (
                <div>
                  <dt className="text-slate-500">Account</dt>
                  <dd><Link href={`/brands/${contact.account.id}`} className="text-primary hover:underline">{contact.account.name}</Link></dd>
                </div>
              )}
            </dl>
          </SectionCard>

          {myDuplicates && (
            <SectionCard
              title="Merge Duplicates"
              action={<GitMerge className="w-4 h-4 text-amber-500" />}
            >
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Potential duplicates detected for this contact.
              </p>
              <ul className="space-y-2 mb-4">
                {myDuplicates.duplicates.map((d) => (
                  <li key={d.id} className="text-sm">{d.firstName} {d.lastName}</li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="outline"
                disabled={mergeMutation.isPending}
                onClick={() =>
                  mergeMutation.mutate({
                    primaryId: myDuplicates.primary.id,
                    duplicateIds: myDuplicates.duplicates.map((d) => d.id),
                  })
                }
              >
                Merge into primary
              </Button>
            </SectionCard>
          )}
        </div>
      </div>

      <ContactFormDialog
        key={contact.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Contact"
        submitLabel="Save Changes"
        initialValues={{
          firstName: contact.firstName,
          lastName: contact.lastName,
          jobTitle: contact.jobTitle ?? '',
          email: contact.emails[0]?.email ?? '',
          phone: contact.phones[0]?.phone ?? '',
          status: contact.status ?? 'Active',
          accountId: contact.account?.id ?? '',
        }}
        loading={updateMutation.isPending}
        onSubmit={(values) => updateMutation.mutate(values)}
      />

      <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} title="Reassign Contact">
        <RecordForm
          fields={[
            {
              name: 'ownerId',
              label: 'New Owner',
              type: 'select',
              required: true,
              options: members?.data?.map((m) => ({
                value: m.id,
                label: `${m.firstName} ${m.lastName}`,
              })) ?? [],
            },
          ]}
          loading={reassignMutation.isPending}
          submitLabel="Reassign"
          onSubmit={(v) => reassignMutation.mutate(v.ownerId)}
        />
      </Dialog>
    </ModulePage>
  );
}
