'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, AlertTriangle, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Role } from '@crm/shared';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { ModulePage, LoadingRows, ErrorMessage, formatCurrency } from '../components/ModulePage';
import { KanbanBoard } from '../components/KanbanBoard';
import { AdvancedDataTable } from '../components/AdvancedDataTable';
import { Button, Dialog, Badge, Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import { RecordForm } from '../components/RecordForm';

interface DealRow {
  id: string;
  name: string;
  value: string;
  currency: string;
  approvalStatus?: string | null;
  approvalRequired?: boolean;
  owner: { firstName: string; lastName: string };
  stage?: { name: string };
}

export function DealsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: kanban, isLoading: kanbanLoading, error: kanbanError } = useQuery({
    queryKey: ['deals-kanban'],
    queryFn: () =>
      apiFetch<{
        data: {
          stages: Array<{
            id: string;
            name: string;
            color: string | null;
            deals: Array<{ id: string; name: string; value: string; owner: { firstName: string; lastName: string } }>;
          }>;
          scope: string;
        };
      }>('/deals/kanban'),
    enabled: view === 'kanban',
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['deals-list'],
    queryFn: () => apiFetch<{ data: DealRow[]; scope: string }>('/deals?limit=50'),
    enabled: view === 'list',
  });

  const { data: forecast } = useQuery({
    queryKey: ['deals-forecast'],
    queryFn: () =>
      apiFetch<{ data: { forecast: Array<{ month: string; value: number }> } }>('/deals/forecast/summary'),
  });

  const { data: rotting } = useQuery({
    queryKey: ['deals-rotting'],
    queryFn: () =>
      apiFetch<{ data: Array<{ id: string; name: string; owner: { firstName: string; lastName: string } }> }>(
        '/deals/rotting/list'
      ),
  });

  const stageMutation = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      apiFetch(`/deals/${dealId}/stage`, { method: 'PATCH', body: JSON.stringify({ stageId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals-kanban'] }),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; value: number; closeDate?: string }) =>
      apiFetch('/deals', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['deals-list'] });
      setCreateOpen(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ dealId, approved, reason }: { dealId: string; approved: boolean; reason?: string }) =>
      apiFetch(`/deals/${dealId}/approve`, { method: 'POST', body: JSON.stringify({ approved, reason }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals-list'] }),
  });

  const chartData = forecast?.data.forecast
    .filter((f) => f.month !== 'unscheduled')
    .map((f) => ({ month: f.month, value: f.value }));

  const canApprove = user?.role === Role.MANAGER || user?.role === Role.BOSS || user?.role === Role.ADMIN;

  const dealColumns: ColumnDef<DealRow, unknown>[] = [
    {
      id: 'name',
      header: 'Deal',
      accessorFn: (r) => r.name,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'value',
      header: 'Value',
      cell: ({ row }) => formatCurrency(row.original.value, row.original.currency),
    },
    { id: 'stage', header: 'Stage', accessorFn: (r) => r.stage?.name ?? '—' },
    {
      id: 'owner',
      header: 'Owner',
      accessorFn: (r) => `${r.owner.firstName} ${r.owner.lastName}`,
    },
    {
      id: 'approval',
      header: 'Approval',
      cell: ({ row }) => {
        const r = row.original;
        if (!r.approvalRequired) return '—';
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Badge variant={r.approvalStatus === 'APPROVED' ? 'success' : r.approvalStatus === 'REJECTED' ? 'destructive' : 'warning'}>
              {r.approvalStatus ?? 'PENDING'}
            </Badge>
            {canApprove && r.approvalStatus === 'PENDING' && (
              <>
                <Button size="sm" variant="ghost" onClick={() => approveMutation.mutate({ dealId: r.id, approved: true })}>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => approveMutation.mutate({ dealId: r.id, approved: false, reason: 'Rejected' })}>
                  <X className="w-3.5 h-3.5 text-red-600" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <ModulePage title="Deals" description="Pipeline and opportunities" scope={kanban?.data?.scope ?? listData?.scope}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button size="sm" variant={view === 'kanban' ? 'primary' : 'outline'} onClick={() => setView('kanban')}>Kanban</Button>
        <Button size="sm" variant={view === 'list' ? 'primary' : 'outline'} onClick={() => setView('list')}>List</Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Deal</Button>
      </div>

      {rotting?.data && rotting.data.length > 0 && (
        <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-200">{rotting.data.length} rotting deal(s)</p>
                <ul className="mt-2 space-y-1">
                  {rotting.data.slice(0, 5).map((d) => (
                    <li key={d.id}>
                      <button className="text-sm text-primary hover:underline" onClick={() => router.push(`/deals/${d.id}`)}>
                        {d.name} — {d.owner.firstName} {d.owner.lastName}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {chartData && chartData.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Forecast</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Bar dataKey="value" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {view === 'kanban' ? (
        <>
          {kanbanLoading && <LoadingRows />}
          {kanbanError && <ErrorMessage error={kanbanError} />}
          {kanban && (
            <KanbanBoard
              stages={kanban.data.stages}
              onStageChange={(dealId, stageId) => stageMutation.mutate({ dealId, stageId })}
            />
          )}
        </>
      ) : (
        <>
          {listLoading && <LoadingRows />}
          {listData && (
            <AdvancedDataTable
              columns={dealColumns}
              data={listData.data}
              onRowClick={(row) => router.push(`/deals/${row.id}`)}
            />
          )}
        </>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Create Deal">
        <RecordForm
          fields={[
            { name: 'name', label: 'Deal Name', required: true },
            { name: 'value', label: 'Value', type: 'number', required: true },
            { name: 'closeDate', label: 'Close Date', type: 'date' },
          ]}
          loading={createMutation.isPending}
          submitLabel="Create Deal"
          onSubmit={(values) =>
            createMutation.mutate({
              name: String(values.name),
              value: Number(values.value),
              closeDate: values.closeDate ? String(values.closeDate) : undefined,
            })
          }
        />
      </Dialog>
    </ModulePage>
  );
}
