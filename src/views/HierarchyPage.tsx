'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Users, ArrowRightLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateIST } from '../lib/locale';
import { ModulePage, LoadingRows, ErrorMessage } from '../components/ModulePage';
import { Button, Dialog, SectionCard, Badge } from '../components/ui';
import { RecordForm } from '../components/RecordForm';

interface OrgNode {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  children?: OrgNode[];
}

interface Delegation {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  delegator: { firstName: string; lastName: string };
  delegatee: { firstName: string; lastName: string };
}

interface Transfer {
  id: string;
  status: string;
  reason: string | null;
  user: { firstName: string; lastName: string };
  fromManager: { firstName: string; lastName: string };
  toManager: { firstName: string; lastName: string };
}

function OrgNodeCard({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const roleColors: Record<string, string> = {
    BOSS: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700',
    MANAGER: 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700',
    EMPLOYEE: 'border-slate-300 bg-muted dark:bg-slate-800 dark:border-slate-700',
    ADMIN: 'border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-700',
  };

  return (
    <div className={depth > 0 ? 'ml-8 mt-3' : ''}>
      <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-lg border ${roleColors[node.role] ?? 'border-border bg-card dark:bg-slate-900'}`}>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
          {node.firstName[0]}{node.lastName[0]}
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{node.firstName} {node.lastName}</p>
          <p className="text-xs text-slate-500">{node.role}</p>
        </div>
      </div>
      {node.children?.map((child) => (
        <OrgNodeCard key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function HierarchyPage() {
  const queryClient = useQueryClient();
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  const { data: orgChart, isLoading, error } = useQuery({
    queryKey: ['org-chart'],
    queryFn: () => apiFetch<{ data: OrgNode[] }>('/users/org-chart'),
  });

  const { data: delegations } = useQuery({
    queryKey: ['delegations'],
    queryFn: () => apiFetch<{ data: Delegation[] }>('/hierarchy-mgmt/delegations'),
  });

  const { data: transfers } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => apiFetch<{ data: Transfer[] }>('/hierarchy-mgmt/transfers'),
  });

  const { data: members } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => apiFetch<{ data: Array<{ id: string; firstName: string; lastName: string; role: string }> }>('/organizations/members'),
  });

  const viewAsMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      apiFetch('/hierarchy-mgmt/view-as', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
    onSuccess: () => setViewAsOpen(false),
  });

  const reassignMutation = useMutation({
    mutationFn: (body: { employeeId: string; newManagerId: string }) =>
      apiFetch('/hierarchy-mgmt/reassign', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-chart'] });
      setReassignOpen(false);
    },
  });

  const approveDelegation = useMutation({
    mutationFn: (id: string) => apiFetch(`/hierarchy-mgmt/delegations/${id}/approve`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delegations'] }),
  });

  const approveTransfer = useMutation({
    mutationFn: (id: string) => apiFetch(`/hierarchy-mgmt/transfers/${id}/approve`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transfers'] }),
  });

  const employees = members?.data?.filter((m) => m.role === 'EMPLOYEE') ?? [];
  const managers = members?.data?.filter((m) => m.role === 'MANAGER' || m.role === 'BOSS') ?? [];

  return (
    <ModulePage title="Hierarchy Management" description="Organization chart, delegations, and transfers">
      <div className="flex flex-wrap gap-2 mb-6">
        <Button size="sm" variant="outline" onClick={() => setViewAsOpen(true)}>
          <Eye className="w-3.5 h-3.5 mr-1" /> View As
        </Button>
        <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)}>
          <Users className="w-3.5 h-3.5 mr-1" /> Reassign Records
        </Button>
      </div>

      {isLoading && <LoadingRows count={3} />}
      {error && <ErrorMessage error={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title="Delegations">
          <div className="space-y-3 -mt-2">
            {delegations?.data?.length ? delegations.data.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted dark:bg-slate-800/50 text-sm">
                <div>
                  <p>{d.delegator.firstName} → {d.delegatee.firstName}</p>
                  <p className="text-xs text-slate-400">{formatDateIST(d.startDate)} – {formatDateIST(d.endDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{d.status}</Badge>
                  {d.status === 'PENDING' && (
                    <Button size="sm" variant="ghost" onClick={() => approveDelegation.mutate(d.id)}>Approve</Button>
                  )}
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No delegations</p>}
          </div>
        </SectionCard>

        <SectionCard title="Transfer Requests">
          <div className="space-y-3 -mt-2">
            {transfers?.data?.length ? transfers.data.map((t) => (
              <div key={t.id} className="p-3 rounded-lg bg-muted dark:bg-slate-800/50 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.user.firstName} {t.user.lastName}</span>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.fromManager.firstName} → {t.toManager.firstName}</span>
                </div>
                {t.reason && <p className="text-xs text-slate-500 mt-1">{t.reason}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <Badge>{t.status}</Badge>
                  {t.status === 'PENDING' && (
                    <Button size="sm" variant="ghost" onClick={() => approveTransfer.mutate(t.id)}>Approve</Button>
                  )}
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No transfer requests</p>}
          </div>
        </SectionCard>
      </div>

      {orgChart && (
        <SectionCard title="Organization Chart">
          <div className="-mt-2">
            {orgChart.data.map((node) => (
              <OrgNodeCard key={node.id} node={node} />
            ))}
          </div>
        </SectionCard>
      )}

      <Dialog open={viewAsOpen} onClose={() => setViewAsOpen(false)} title="View As User">
        <RecordForm
          fields={[
            {
              name: 'targetUserId',
              label: 'User',
              type: 'select',
              required: true,
              options: members?.data?.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName} (${m.role})` })) ?? [],
            },
          ]}
          loading={viewAsMutation.isPending}
          submitLabel="Start Session"
          onSubmit={(v) => viewAsMutation.mutate(v.targetUserId)}
        />
      </Dialog>

      <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} title="Reassign Employee Records">
        <RecordForm
          fields={[
            { name: 'employeeId', label: 'Employee', type: 'select', required: true, options: employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })) },
            { name: 'newManagerId', label: 'New Manager', type: 'select', required: true, options: managers.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })) },
          ]}
          loading={reassignMutation.isPending}
          submitLabel="Reassign"
          onSubmit={(v) => reassignMutation.mutate({ employeeId: String(v.employeeId), newManagerId: String(v.newManagerId) })}
        />
      </Dialog>
    </ModulePage>
  );
}
