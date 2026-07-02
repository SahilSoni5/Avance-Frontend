'use client';

import { useState } from 'react';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { ModulePage, LoadingRows, ErrorMessage, OwnerCell } from '../components/ModulePage';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button, Dialog, SectionCard } from '../components/ui';
import { RecordForm } from '../components/RecordForm';

interface AccountDetail {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  owner: { firstName: string; lastName: string };
}

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['account', id],
    queryFn: () => apiFetch<{ data: AccountDetail }>(`/accounts/${id}`),
    enabled: !!id,
  });

  const account = data?.data;

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', id] });
      setEditOpen(false);
    },
  });

  if (isLoading) return <ModulePage title="Account"><LoadingRows /></ModulePage>;
  if (error || !account) return <ModulePage title="Account"><ErrorMessage error={error ?? 'Not found'} /></ModulePage>;

  return (
    <ModulePage title={account.name} description={account.industry ?? undefined}>
      <Breadcrumbs items={[{ label: 'Accounts', href: '/accounts' }, { label: account.name }]} />

      <div className="mt-4 mb-6">
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
      </div>

      <SectionCard title="Account Details">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><dt className="text-slate-500">Industry</dt><dd className="font-medium">{account.industry ?? '—'}</dd></div>
          <div><dt className="text-slate-500">Website</dt><dd>{account.website ? <a href={account.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{account.website}</a> : '—'}</dd></div>
          <div><dt className="text-slate-500">Owner</dt><dd><OwnerCell owner={account.owner} /></dd></div>
        </dl>
      </SectionCard>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Account">
        <RecordForm
          defaultValues={{
            name: account.name,
            industry: account.industry ?? '',
            website: account.website ?? '',
          }}
          fields={[
            { name: 'name', label: 'Company Name', required: true },
            { name: 'industry', label: 'Industry' },
            { name: 'website', label: 'Website' },
          ]}
          loading={updateMutation.isPending}
          onSubmit={(v) => updateMutation.mutate(v)}
        />
      </Dialog>
    </ModulePage>
  );
}
