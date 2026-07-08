'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2 } from 'lucide-react';
import { hasPermission } from '@crm/shared';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { ModulePage, LoadingRows, ErrorMessage, OwnerCell } from '../components/ModulePage';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button, SectionCard } from '../components/ui';
import { BrandEditDialog, type BrandEditValues } from '../components/BrandEditDialog';
import { BrandUpdatesSection } from '../components/BrandUpdatesSection';
import { PipelineRecordCard, type PipelineRecord } from '../components/related/PipelineRecordCard';
import { invalidateContactBrandSync } from '../lib/query-invalidation';

const INDUSTRIES = [
  'FMCG', 'Banking', 'Insurance', 'Retail', 'Technology', 'Healthcare', 'Education',
  'Real Estate', 'Manufacturing', 'Media', 'Hospitality', 'Logistics', 'Other',
];

interface AccountDetail {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string | null;
  owner: { firstName: string; lastName: string };
}

interface BrandPoc {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
}

interface BrandPipeline {
  activeDeals: PipelineRecord[];
  closedDeals: PipelineRecord[];
  activeOpportunities: PipelineRecord[];
  closedOpportunities: PipelineRecord[];
}

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const canUpdate = user && hasPermission(user.role, 'brands', 'update');
  const canDelete = user && hasPermission(user.role, 'brands', 'delete');

  const { data, isLoading, error } = useQuery({
    queryKey: ['brand-detail', id],
    queryFn: () => apiFetch<{ data: AccountDetail }>(`/brands/${id}`),
    enabled: !!id,
  });

  const account = data?.data;

  const { data: pocsData } = useQuery({
    queryKey: ['brand-pocs', id],
    queryFn: () => apiFetch<{ data: BrandPoc[] }>(`/brands/${id}/pocs`),
    enabled: !!id,
  });

  const { data: pipelineData } = useQuery({
    queryKey: ['brand-pipeline', id],
    queryFn: () => apiFetch<{ data: BrandPipeline }>(`/brands/${id}/pipeline`),
    enabled: !!id,
  });

  const pocs = pocsData?.data ?? [];
  const pipeline = pipelineData?.data;
  const activePipeline = [
    ...(pipeline?.activeOpportunities ?? []),
    ...(pipeline?.activeDeals ?? []),
  ].filter((r) => r.visible);
  const closedPipeline = [
    ...(pipeline?.closedOpportunities ?? []),
    ...(pipeline?.closedDeals ?? []),
  ].filter((r) => r.visible);

  const updateMutation = useMutation({
    mutationFn: (values: BrandEditValues) =>
      apiFetch(`/brands/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: values.name,
          ...(values.industry ? { industry: values.industry } : { industry: null }),
          ...(values.website ? { website: values.website } : { website: null }),
          ...(values.phone ? { phone: values.phone } : { phone: null }),
          ...(values.email ? { email: values.email } : { email: null }),
          ...(values.address ? { address: values.address } : { address: null }),
          ...(values.status ? { status: values.status } : { status: null }),
        }),
      }),
    onSuccess: () => {
      invalidateContactBrandSync(queryClient, { accountId: id });
      setEditOpen(false);
      setEditError(null);
    },
    onError: (err: Error) => setEditError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/brands/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidateContactBrandSync(queryClient, { accountId: id });
      router.push('/brands');
    },
  });

  if (isLoading) return <ModulePage title="Brand"><LoadingRows /></ModulePage>;
  if (error || !account) return <ModulePage title="Brand"><ErrorMessage error={error ?? 'Not found'} /></ModulePage>;

  return (
    <ModulePage title={account.name} description={account.industry ?? undefined}>
      <Breadcrumbs items={[{ label: 'Brands', href: '/brands' }, { label: account.name }]} />

      <div className="mt-4 mb-6 flex gap-2">
        {canUpdate && (
          <Button size="sm" variant="outline" onClick={() => { setEditError(null); setEditOpen(true); }}>
            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        )}
        {canDelete && (
          <Button
            size="sm"
            variant="outline"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Delete brand "${account.name}"? This cannot be undone.`)) {
                deleteMutation.mutate();
              }
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        )}
      </div>

      <SectionCard title="Brand Details">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><dt className="text-slate-500">Industry</dt><dd className="font-medium">{account.industry ?? '—'}</dd></div>
          <div><dt className="text-slate-500">Status</dt><dd className="font-medium">{account.status ?? '—'}</dd></div>
          <div>
            <dt className="text-slate-500">Website</dt>
            <dd>
              {account.website ? (
                <a href={account.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {account.website}
                </a>
              ) : '—'}
            </dd>
          </div>
          <div><dt className="text-slate-500">Phone</dt><dd>{account.phone ?? '—'}</dd></div>
          <div><dt className="text-slate-500">Email</dt><dd>{account.email ?? '—'}</dd></div>
          <div><dt className="text-slate-500">Address</dt><dd>{account.address ?? '—'}</dd></div>
          <div><dt className="text-slate-500">Owner</dt><dd><OwnerCell owner={account.owner} /></dd></div>
        </dl>
      </SectionCard>

      {pocs.length > 0 && (
        <SectionCard title="Points of Contact">
          <ul className="space-y-2 -mt-2">
            {pocs.map((poc) => (
              <li key={poc.id}>
                <Link href={`/contacts/${poc.id}`} className="text-primary hover:underline font-medium">
                  {poc.firstName} {poc.lastName}
                </Link>
                {poc.jobTitle && <span className="text-sm text-slate-500"> · {poc.jobTitle}</span>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {(activePipeline.length > 0 || closedPipeline.length > 0) && (
        <SectionCard title="Pipeline">
          <div className="space-y-4 -mt-2">
            {activePipeline.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active</h4>
                <div className="space-y-2">
                  {activePipeline.map((record) => (
                    <PipelineRecordCard key={`${record.recordType}-${record.id}`} record={record} />
                  ))}
                </div>
              </div>
            )}
            {closedPipeline.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Closed</h4>
                <div className="space-y-2">
                  {closedPipeline.map((record) => (
                    <PipelineRecordCard key={`${record.recordType}-${record.id}`} record={record} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {id && <BrandUpdatesSection accountId={id} canPost={!!canUpdate} />}

      <BrandEditDialog
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditError(null);
        }}
        industries={INDUSTRIES}
        initial={{
          name: account.name,
          industry: account.industry ?? '',
          website: account.website ?? '',
          phone: account.phone ?? '',
          email: account.email ?? '',
          address: account.address ?? '',
          status: account.status ?? '',
        }}
        loading={updateMutation.isPending}
        error={editError}
        onSave={(values) => updateMutation.mutate(values)}
      />
    </ModulePage>
  );
}
