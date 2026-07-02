'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { ModulePage, LoadingRows, ErrorMessage, OwnerCell, StatusBadge } from '../components/ModulePage';
import { AdvancedDataTable } from '../components/AdvancedDataTable';
import { Button, Dialog } from '../components/ui';
import { RecordForm } from '../components/RecordForm';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  assignee: { firstName: string; lastName: string } | null;
}

const ticketColumns: ColumnDef<Ticket, unknown>[] = [
  {
    id: 'subject',
    header: 'Subject',
    accessorFn: (r) => r.subject,
    cell: ({ row }) => <span className="font-medium text-slate-900 dark:text-slate-100">{row.original.subject}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status.replace(/_/g, ' ')} />,
  },
  { id: 'priority', header: 'Priority', accessorFn: (r) => r.priority },
  {
    id: 'assignee',
    header: 'Assignee',
    cell: ({ row }) => (row.original.assignee ? <OwnerCell owner={row.original.assignee} /> : 'Unassigned'),
  },
];

export function TicketsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => apiFetch<{ data: Ticket[]; scope: string }>('/tickets?limit=50'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { subject: string; description?: string; priority?: string }) =>
      apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({ ...body, priority: body.priority || 'medium' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setCreateOpen(false);
    },
  });

  return (
    <ModulePage title="Tickets" description="Support tickets in your scope" scope={data?.scope}>
      <div className="flex gap-2 mb-4">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Ticket
        </Button>
      </div>

      {isLoading && <LoadingRows />}
      {error && <ErrorMessage error={error} />}
      {data && (
        <AdvancedDataTable
          columns={ticketColumns}
          data={data.data}
          onRowClick={(row) => router.push(`/tickets/${row.id}`)}
          emptyMessage="No tickets in your scope"
        />
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Create Ticket">
        <RecordForm
          fields={[
            { name: 'subject', label: 'Subject', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            {
              name: 'priority',
              label: 'Priority',
              type: 'select',
              options: [
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ],
            },
          ]}
          loading={createMutation.isPending}
          submitLabel="Create Ticket"
          onSubmit={(values) => createMutation.mutate(values)}
        />
      </Dialog>
    </ModulePage>
  );
}
