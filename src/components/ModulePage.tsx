'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { formatCurrencyINR } from '../lib/locale';

interface ModulePageProps {
  title: string;
  description?: string;
  scope?: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function ModulePage({ title, description, scope, children, action }: ModulePageProps) {
  return (
    <div className="p-6 sm:p-8 animate-fade-in">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
          )}
          {scope && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
              {scope} scope
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="glass-card text-center py-16 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden !rounded-2xl !translate-y-0">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-primary/5 transition-colors duration-150">
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 text-sm text-foreground/80">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-xl border border-border shimmer"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-500/20 animate-slide-up">
      {error instanceof Error ? error.message : 'Failed to load data'}
    </div>
  );
}

export function formatCurrency(value: number | string, _currency = 'INR') {
  return formatCurrencyINR(value);
}

export function OwnerCell({ owner }: { owner: { firstName: string; lastName: string } }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/80 to-indigo-500 text-[10px] font-bold text-white flex items-center justify-center">
        {owner.firstName[0]}{owner.lastName[0]}
      </span>
      {owner.firstName} {owner.lastName}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  open: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
  closed: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  won: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  lost: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  picked: 'bg-emerald-800 text-emerald-100 border-emerald-800',
  not_picked: 'bg-amber-100 text-amber-900 border-amber-200',
  rescheduled: 'bg-sky-100 text-sky-800 border-sky-200',
  dnd_at_all: 'bg-red-700 text-white border-red-700',
  someone_else_reached: 'bg-neutral-800 text-neutral-100 border-neutral-800',
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const key = (status ?? 'active').toLowerCase().replace(/\s+/g, '_');
  const colorClass = STATUS_COLORS[key] ?? 'bg-muted text-muted-foreground border-border';
  const preserveCase = [
    'picked',
    'not_picked',
    'rescheduled',
    'dnd_at_all',
    'someone_else_reached',
  ].includes(key);
  return (
    <span
      className={cn(
        'inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full border',
        !preserveCase && 'capitalize',
        colorClass,
      )}
    >
      {status ?? 'Active'}
    </span>
  );
}
