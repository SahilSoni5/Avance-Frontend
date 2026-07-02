'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { Role } from '@crm/shared';
import { apiFetch } from '../lib/api';
import { formatCurrencyINR, formatDateIST, formatDateTimeIST } from '../lib/locale';
import { ModulePage, LoadingRows, ErrorMessage } from '../components/ModulePage';
import { Button, Card, SectionCard, Dialog } from '../components/ui';
import { RecordForm } from '../components/RecordForm';
import { Input } from '../components/ui/Input';

export function NotificationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: () =>
      apiFetch<{ data: Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }>; unreadCount: number }>(
        '/notifications'
      ),
  });

  return (
    <ModulePage title="Notifications" description={`${data?.unreadCount ?? 0} unread`}>
      {isLoading && <LoadingRows />}
      {error && <ErrorMessage error={error} />}
      {data && (
        <div className="space-y-2">
          {data.data.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border ${n.isRead ? 'bg-card dark:bg-slate-900 border-border dark:border-slate-800' : 'bg-primary/5 border-primary/20'}`}
            >
              <p className="font-medium text-sm">{n.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{n.message}</p>
              <p className="text-xs text-slate-400 mt-2">{formatDateTimeIST(n.createdAt)}</p>
            </div>
          ))}
          {data.data.length === 0 && <p className="text-center text-slate-500 py-8">No notifications</p>}
        </div>
      )}
    </ModulePage>
  );
}

export function GoalsPage() {
  const user = useAuthStore((s) => s.user);
  const endpoint = user?.role === Role.BOSS || user?.role === Role.ADMIN ? '/goals/cascade' : '/goals/quotas';
  const { data, isLoading, error } = useQuery({
    queryKey: ['goals', endpoint],
    queryFn: () => apiFetch<{ data: unknown }>(endpoint),
  });

  return (
    <ModulePage title="Goals & Quotas" description="Quota targets and attainment">
      {isLoading && <LoadingRows />}
      {error && <ErrorMessage error={error} />}
      {data && (
        <Card className="p-6">
          <pre className="text-xs overflow-auto max-h-96 text-slate-700 dark:text-slate-300">{JSON.stringify(data, null, 2)}</pre>
        </Card>
      )}
    </ModulePage>
  );
}

export function BillingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['billing'],
    queryFn: () =>
      apiFetch<{ data: { plan: string; seats: number; seatsUsed: number; invoices: Array<{ id: string; amount: number; status: string; date: string }> } }>(
        '/billing'
      ),
  });

  return (
    <ModulePage title="Billing" description="Subscription and usage">
      {isLoading && <LoadingRows />}
      {error && <ErrorMessage error={error} />}
      {data?.data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-6"><p className="text-sm text-slate-500">Plan</p><p className="text-2xl font-bold mt-1">{data.data.plan}</p></Card>
            <Card className="p-6"><p className="text-sm text-slate-500">Seats Used</p><p className="text-2xl font-bold mt-1">{data.data.seatsUsed} / {data.data.seats}</p></Card>
            <Card className="p-6"><p className="text-sm text-slate-500">Invoices</p><p className="text-2xl font-bold mt-1">{data.data.invoices?.length ?? 0}</p></Card>
          </div>
          {data.data.invoices?.length > 0 && (
            <SectionCard title="Recent Invoices">
              <table className="w-full text-sm -mt-2">
                <thead><tr className="text-left text-slate-500 border-b dark:border-slate-800"><th className="pb-2">Date</th><th className="pb-2">Amount</th><th className="pb-2">Status</th></tr></thead>
                <tbody>
                  {data.data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b dark:border-slate-800">
                      <td className="py-2">{formatDateIST(inv.date)}</td>
                      <td className="py-2">{formatCurrencyINR(inv.amount)}</td>
                      <td className="py-2 capitalize">{inv.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}
        </>
      )}
    </ModulePage>
  );
}

export function DataPage() {
  const queryClient = useQueryClient();
  const [gdprContactId, setGdprContactId] = useState('');
  const [gdprResult, setGdprResult] = useState<string | null>(null);

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () =>
      apiFetch<{ data: Array<{ action: string; entityType: string; createdAt: string; user: { firstName: string; lastName: string } }> }>(
        '/data/audit'
      ),
  });

  const { data: recycleBin, isLoading: binLoading } = useQuery({
    queryKey: ['recycle-bin'],
    queryFn: () =>
      apiFetch<{
        data: {
          contacts: Array<{ id: string; firstName: string; lastName: string; deletedAt: string }>;
          accounts: Array<{ id: string; name: string; deletedAt: string }>;
          deals: Array<{ id: string; name: string; deletedAt: string }>;
        };
      }>('/data/recycle-bin'),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      apiFetch('/data/restore', { method: 'POST', body: JSON.stringify({ type, id }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recycle-bin'] }),
  });

  const gdprExportMutation = useMutation({
    mutationFn: (contactId: string) => apiFetch<{ data: unknown }>(`/data/gdpr/${contactId}`),
    onSuccess: (res) => setGdprResult(JSON.stringify(res.data, null, 2)),
  });

  const bin = recycleBin?.data;

  return (
    <ModulePage title="Data Management" description="Audit log, recycle bin, and GDPR tools">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title="Recycle Bin">
          {(binLoading) && <LoadingRows count={2} />}
          {bin && (
            <div className="space-y-4 -mt-2 max-h-80 overflow-y-auto">
              {[
                ...bin.contacts.map((c) => ({ type: 'contact', id: c.id, label: `${c.firstName} ${c.lastName}`, deletedAt: c.deletedAt })),
                ...bin.accounts.map((a) => ({ type: 'account', id: a.id, label: a.name, deletedAt: a.deletedAt })),
                ...bin.deals.map((d) => ({ type: 'deal', id: d.id, label: d.name, deletedAt: d.deletedAt })),
              ].map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between text-sm p-2 rounded bg-muted dark:bg-slate-800/50">
                  <div>
                    <p className="font-medium capitalize">{item.type}: {item.label}</p>
                    <p className="text-xs text-slate-400">Deleted {formatDateTimeIST(item.deletedAt)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => restoreMutation.mutate({ type: item.type, id: item.id })}>
                    Restore
                  </Button>
                </div>
              ))}
              {!bin.contacts.length && !bin.accounts.length && !bin.deals.length && (
                <p className="text-sm text-slate-500 text-center py-4">Recycle bin is empty</p>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="GDPR Export">
          <div className="space-y-4 -mt-2">
            <Input
              label="Contact ID"
              value={gdprContactId}
              onChange={(e) => setGdprContactId(e.target.value)}
              placeholder="Enter contact UUID"
            />
            <Button
              size="sm"
              disabled={!gdprContactId.trim() || gdprExportMutation.isPending}
              onClick={() => gdprExportMutation.mutate(gdprContactId.trim())}
            >
              Export Contact Data
            </Button>
            {gdprResult && (
              <pre className="text-xs p-3 rounded bg-muted dark:bg-slate-800 overflow-auto max-h-48">{gdprResult}</pre>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Audit Log">
        {auditLoading && <LoadingRows />}
        {audit && (
          <div className="overflow-x-auto -mt-2">
            <table className="w-full text-sm">
              <thead className="bg-muted dark:bg-slate-800/50">
                <tr><th className="px-4 py-2 text-left">Action</th><th className="px-4 py-2 text-left">Entity</th><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">When</th></tr>
              </thead>
              <tbody>
                {audit.data.map((log, i) => (
                  <tr key={i} className="border-t dark:border-slate-800">
                    <td className="px-4 py-2">{log.action}</td>
                    <td className="px-4 py-2">{log.entityType}</td>
                    <td className="px-4 py-2">{log.user.firstName} {log.user.lastName}</td>
                    <td className="px-4 py-2">{formatDateTimeIST(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </ModulePage>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, setAuth } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['org-settings'],
    queryFn: () =>
      apiFetch<{ data: { name: string; industry: string; timezone: string; currency: string; dealApprovalThreshold: number } }>(
        '/organizations/current'
      ),
  });

  const profileMutation = useMutation({
    mutationFn: (body: { firstName?: string; lastName?: string; phone?: string; timezone?: string }) =>
      apiFetch<{ data: typeof user }>('/users/profile', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (res) => {
      if (user && res.data) {
        setAuth(useAuthStore.getState().accessToken!, { ...user, ...res.data });
      }
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      setProfileOpen(false);
    },
  });

  const orgMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/organizations/current', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      setOrgOpen(false);
    },
  });

  return (
    <ModulePage title="Settings" description="Organization and profile preferences">
      {isLoading && <LoadingRows />}
      {data?.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard
            title="Profile"
            action={<Button size="sm" variant="outline" onClick={() => setProfileOpen(true)}>Edit</Button>}
          >
            <dl className="space-y-3 text-sm -mt-2">
              <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{user?.firstName} {user?.lastName}</dd></div>
              <div><dt className="text-slate-500">Email</dt><dd>{user?.email}</dd></div>
              <div><dt className="text-slate-500">Role</dt><dd>{user?.role}</dd></div>
            </dl>
          </SectionCard>

          <SectionCard
            title="Organization"
            action={<Button size="sm" variant="outline" onClick={() => setOrgOpen(true)}>Edit</Button>}
          >
            <dl className="space-y-3 text-sm -mt-2">
              <div><dt className="text-slate-500">Organization</dt><dd className="font-medium">{data.data.name}</dd></div>
              <div><dt className="text-slate-500">Industry</dt><dd>{data.data.industry ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Timezone</dt><dd>{data.data.timezone}</dd></div>
              <div><dt className="text-slate-500">Currency</dt><dd>{data.data.currency}</dd></div>
              <div><dt className="text-slate-500">Deal Approval Threshold</dt><dd>{formatCurrencyINR(data.data.dealApprovalThreshold ?? 0)}</dd></div>
            </dl>
          </SectionCard>
        </div>
      )}

      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} title="Edit Profile">
        <RecordForm<{ firstName: string; lastName: string; phone?: string; timezone?: string }>
          defaultValues={{ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' }}
          fields={[
            { name: 'firstName', label: 'First Name', required: true },
            { name: 'lastName', label: 'Last Name', required: true },
            { name: 'phone', label: 'Phone' },
            { name: 'timezone', label: 'Timezone' },
          ]}
          loading={profileMutation.isPending}
          onSubmit={(v) => profileMutation.mutate(v)}
        />
      </Dialog>

      <Dialog open={orgOpen} onClose={() => setOrgOpen(false)} title="Edit Organization">
        <RecordForm
          defaultValues={{
            name: data?.data.name ?? '',
            industry: data?.data.industry ?? '',
            timezone: data?.data.timezone ?? '',
            currency: data?.data.currency ?? '',
            dealApprovalThreshold: String(data?.data.dealApprovalThreshold ?? ''),
          }}
          fields={[
            { name: 'name', label: 'Organization Name', required: true },
            { name: 'industry', label: 'Industry' },
            { name: 'timezone', label: 'Timezone' },
            { name: 'currency', label: 'Currency' },
            { name: 'dealApprovalThreshold', label: 'Deal Approval Threshold', type: 'number' },
          ]}
          loading={orgMutation.isPending}
          onSubmit={(v) => orgMutation.mutate(v)}
        />
      </Dialog>
    </ModulePage>
  );
}
