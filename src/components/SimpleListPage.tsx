'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { ModulePage, LoadingRows, ErrorMessage } from './ModulePage';

interface SimpleListPageProps {
  title: string;
  description: string;
  endpoint: string;
  queryKey: string;
  columns: Array<{ key: string; header: string; render: (row: Record<string, unknown>) => React.ReactNode }>;
  emptyMessage?: string;
}

export function SimpleListPage({ title, description, endpoint, queryKey, columns, emptyMessage }: SimpleListPageProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: () => apiFetch<{ data: Record<string, unknown>[]; scope?: string }>(endpoint),
  });

  return (
    <ModulePage title={title} description={description} scope={data?.scope}>
      {isLoading && <LoadingRows />}
      {error && <ErrorMessage error={error} />}
      {data && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.data.map((row) => (
                <tr key={String(row.id)} className="hover:bg-muted">
                  {columns.map((c) => (
                    <td key={c.key} className="px-6 py-4 text-sm text-slate-600">{c.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.data.length === 0 && (
            <div className="text-center py-12 text-slate-500">{emptyMessage ?? 'No records'}</div>
          )}
        </div>
      )}
    </ModulePage>
  );
}

export function ownerName(row: Record<string, unknown>, field = 'owner') {
  const o = row[field] as { firstName?: string; lastName?: string } | undefined;
  return o ? `${o.firstName} ${o.lastName}` : '—';
}
