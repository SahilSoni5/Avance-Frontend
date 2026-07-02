'use client';

import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { ModulePage, LoadingRows, ErrorMessage } from '../components/ModulePage';
import { AdvancedDataTable } from '../components/AdvancedDataTable';
import { Button, Dialog } from '../components/ui';
import { RecordForm, type FormFieldConfig } from '../components/RecordForm';
import { apiFetch } from '../lib/api';
import { formatCurrencyINR, formatDateIST, formatDateTimeIST, formatNumberIN } from '../lib/locale';
import { ownerName } from '../components/SimpleListPage';

interface ModuleListConfig {
  title: string;
  description: string;
  endpoint: string;
  queryKey: string;
  columns: ColumnDef<Record<string, unknown>, unknown>[];
  createEndpoint?: string;
  createFields?: FormFieldConfig<Record<string, unknown>>[];
  createBody?: (values: Record<string, unknown>) => unknown;
}

function ModuleListPage({
  title,
  description,
  endpoint,
  queryKey,
  columns,
  createEndpoint,
  createFields,
  createBody,
}: ModuleListConfig) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: () => apiFetch<{ data: Record<string, unknown>[]; scope?: string }>(endpoint),
  });

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      apiFetch(createEndpoint!, {
        method: 'POST',
        body: JSON.stringify(createBody ? createBody(values) : values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setCreateOpen(false);
    },
  });

  const tableData = (data?.data ?? []) as Array<{ id: string } & Record<string, unknown>>;

  return (
    <ModulePage title={title} description={description} scope={data?.scope}>
      {createEndpoint && createFields && (
        <div className="flex justify-end mb-4 -mt-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create
          </Button>
        </div>
      )}
      {isLoading && <LoadingRows />}
      {error && <ErrorMessage error={error} />}
      {data && (
        <AdvancedDataTable columns={columns} data={tableData} emptyMessage="No records" />
      )}
      {createFields && (
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={`Create ${title.replace(/s$/, '')}`}>
          <RecordForm fields={createFields} loading={createMutation.isPending} onSubmit={(v) => createMutation.mutate(v)} />
        </Dialog>
      )}
    </ModulePage>
  );
}

function col(
  id: string,
  header: string,
  render: (row: Record<string, unknown>) => ReactNode,
  accessorFn?: (row: Record<string, unknown>) => unknown
): ColumnDef<Record<string, unknown>, unknown> {
  return {
    id,
    header,
    accessorFn: accessorFn ?? ((row) => render(row)),
    cell: ({ row }) => render(row.original),
  };
}

export const CallsPage = () => (
  <ModuleListPage
    title="Calls"
    description="Call logs in your scope"
    endpoint="/calls"
    queryKey="calls"
    createEndpoint="/calls"
    createFields={[
      { name: 'direction', label: 'Direction', type: 'select', required: true, options: [{ value: 'inbound', label: 'Inbound' }, { value: 'outbound', label: 'Outbound' }] },
      { name: 'duration', label: 'Duration (seconds)', type: 'number' },
      { name: 'outcome', label: 'Outcome' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ]}
    createBody={(v) => ({ direction: v.direction, duration: v.duration ? Number(v.duration) : undefined, outcome: v.outcome, notes: v.notes })}
    columns={[
      col('direction', 'Direction', (r) => String(r.direction)),
      col('duration', 'Duration', (r) => (r.duration ? `${r.duration}s` : '—')),
      col('outcome', 'Outcome', (r) => String(r.outcome ?? '—')),
      col('loggedBy', 'Logged By', (r) => ownerName(r, 'loggedBy')),
    ]}
  />
);

export const CalendarPage = () => (
  <ModuleListPage
    title="Calendar"
    description="Events and meetings"
    endpoint="/calendar/events"
    queryKey="calendar"
    createEndpoint="/calendar/events"
    createFields={[
      { name: 'title', label: 'Title', required: true },
      { name: 'startAt', label: 'Start', type: 'date', required: true },
      { name: 'endAt', label: 'End', type: 'date' },
      { name: 'location', label: 'Location' },
    ]}
    columns={[
      col('title', 'Event', (r) => <span className="font-medium">{String(r.title)}</span>),
      col('startAt', 'Start', (r) => formatDateTimeIST(String(r.startAt))),
      col('organizer', 'Organizer', (r) => ownerName(r, 'organizer')),
    ]}
  />
);

export const CampaignsPage = () => (
  <ModuleListPage
    title="Campaigns"
    description="Marketing campaigns"
    endpoint="/campaigns"
    queryKey="campaigns"
    createEndpoint="/campaigns"
    createFields={[
      { name: 'name', label: 'Campaign Name', required: true },
      { name: 'type', label: 'Type', required: true },
      { name: 'subject', label: 'Subject' },
      { name: 'body', label: 'Body', type: 'textarea' },
    ]}
    columns={[
      col('name', 'Campaign', (r) => <span className="font-medium">{String(r.name)}</span>),
      col('type', 'Type', (r) => String(r.type)),
      col('status', 'Status', (r) => String(r.status)),
    ]}
  />
);

export const AutomationsPage = () => (
  <ModuleListPage
    title="Automations"
    description="Workflow automations"
    endpoint="/automations"
    queryKey="automations"
    createEndpoint="/automations"
    createFields={[
      { name: 'name', label: 'Workflow Name', required: true },
      { name: 'trigger', label: 'Trigger', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
    ]}
    columns={[
      col('name', 'Workflow', (r) => <span className="font-medium">{String(r.name)}</span>),
      col('trigger', 'Trigger', (r) => String(r.trigger)),
      col('isEnabled', 'Status', (r) => (r.isEnabled ? 'Active' : 'Disabled')),
    ]}
  />
);

export const DocumentsPage = () => (
  <ModuleListPage
    title="Documents"
    description="Files attached to records"
    endpoint="/documents"
    queryKey="documents"
    createEndpoint="/documents"
    createFields={[
      { name: 'name', label: 'File Name', required: true },
      { name: 'mimeType', label: 'MIME Type' },
      { name: 'url', label: 'URL' },
    ]}
    columns={[
      col('name', 'File', (r) => <span className="font-medium">{String(r.name)}</span>),
      col('mimeType', 'Type', (r) => String(r.mimeType)),
      col('owner', 'Owner', (r) => ownerName(r)),
    ]}
  />
);

export const EmailsPage = () => (
  <ModuleListPage
    title="Emails"
    description="Email activity in your scope"
    endpoint="/emails"
    queryKey="emails"
    columns={[
      col('subject', 'Subject', (r) => <span className="font-medium">{String(r.subject)}</span>),
      col('sentBy', 'Sent By', (r) => ownerName(r, 'sentBy')),
      col('sentAt', 'Sent', (r) => (r.sentAt ? formatDateIST(String(r.sentAt)) : '—')),
    ]}
  />
);

export const ProductsPage = () => (
  <ModuleListPage
    title="Products"
    description="Product catalog and price books"
    endpoint="/products"
    queryKey="products"
    columns={[
      col('name', 'Product', (r) => <span className="font-medium">{String(r.name)}</span>),
      col('sku', 'SKU', (r) => String(r.sku)),
      col('price', 'Price', (r) => formatCurrencyINR(Number(r.price))),
    ]}
  />
);

export const TeamsPage = () => (
  <ModuleListPage
    title="Teams & Territories"
    description="Team structure"
    endpoint="/teams"
    queryKey="teams"
    columns={[
      col('name', 'Team', (r) => <span className="font-medium">{String(r.name)}</span>),
      col('manager', 'Manager', (r) => ownerName(r, 'manager')),
      col('members', 'Members', (r) => String((r.members as unknown[])?.length ?? 0)),
    ]}
  />
);

export const PortalPage = () => (
  <ModuleListPage
    title="Customer Portal"
    description="Knowledge base articles (admin)"
    endpoint="/portal/articles"
    queryKey="portal"
    columns={[
      col('title', 'Article', (r) => <span className="font-medium">{String(r.title)}</span>),
      col('helpfulCount', 'Helpful', (r) => String(r.helpfulCount ?? 0)),
    ]}
  />
);
