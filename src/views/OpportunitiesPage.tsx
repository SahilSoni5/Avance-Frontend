'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Loader2, Plus, Search, Target } from 'lucide-react';
import { createOpportunity, listOpportunities } from '@/api/opportunities';
import { OpportunityFormDialog } from '@/components/opportunity/OpportunityFormDialog';
import { OPPORTUNITY_STAGES, SF_PAGE_BG, stageBadgeClass } from '@/components/opportunity/constants';
import { showToast } from '@/components/opportunity/toast';
import { formatOpportunityCurrency, formatOpportunityDate } from '@/components/opportunity/utils';
import { cn } from '@/lib/utils';

export function OpportunitiesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: opportunities = [], isLoading, error } = useQuery({
    queryKey: ['opportunities-index'],
    queryFn: () => listOpportunities(200),
  });

  const createMutation = useMutation({
    mutationFn: createOpportunity,
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities-index'] });
      setCreateOpen(false);
      setCreateError(null);
      showToast('Opportunity created');
      router.push(`/opportunities/${row.id}`);
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities.filter((row) => {
      if (stageFilter !== 'all' && row.stage !== stageFilter) return false;
      if (!q) return true;
      const hay = [
        row.name,
        row.account?.name,
        row.stage,
        row.owner.firstName,
        row.owner.lastName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [opportunities, search, stageFilter]);

  const pipelineTotals = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const stage of OPPORTUNITY_STAGES) map.set(stage, { count: 0, amount: 0 });
    for (const row of opportunities) {
      const bucket = map.get(row.stage) ?? { count: 0, amount: 0 };
      bucket.count += 1;
      bucket.amount += row.amount ?? 0;
      map.set(row.stage, bucket);
    }
    return map;
  }, [opportunities]);

  return (
    <div className="opportunity-page min-h-full" style={{ backgroundColor: SF_PAGE_BG }}>
      <div className="sf-list-header px-4 sm:px-6 py-4 border-b border-[#c9c9c9] bg-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-[#706e6b] uppercase tracking-wide font-semibold">Opportunities</p>
            <h1 className="text-2xl font-bold text-[#181818] flex items-center gap-2 mt-0.5">
              <Target className="w-6 h-6 text-[#0176D3]" />
              All Opportunities
            </h1>
            <p className="text-xs text-[#706e6b] mt-1">{opportunities.length} records · Pipeline view</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#706e6b]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search this list..."
                className="w-full rounded border border-[#c9c9c9] pl-9 pr-3 py-2 text-sm outline-none focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3]"
              />
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded bg-[#0176D3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#014486]"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 overflow-x-auto">
        <div className="mb-4 rounded border border-[#c9c9c9] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="flex min-w-[980px]">
            {OPPORTUNITY_STAGES.map((stage, idx) => {
              const stats = pipelineTotals.get(stage);
              const isActive = stageFilter === stage;
              const count = stats?.count ?? 0;
              const amount = stats?.amount ?? 0;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setStageFilter(stage)}
                  className={cn(
                    'relative flex-1 border-r border-[#c9c9c9] px-3 py-2 text-left',
                    idx === OPPORTUNITY_STAGES.length - 1 && 'border-r-0',
                    isActive ? 'bg-[#0176D3] text-white' : 'bg-white hover:bg-[#f3f3f3]'
                  )}
                >
                  <p className="text-[11px] font-semibold truncate">{stage} ({count})</p>
                  <p className={cn('text-sm font-bold tabular-nums mt-0.5', isActive ? 'text-white' : 'text-[#2e844a]')}>
                    {formatOpportunityCurrency(amount)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 min-w-max mb-4">
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold',
              stageFilter === 'all'
                ? 'border-[#0176D3] bg-[#0176D3] text-white'
                : 'border-[#c9c9c9] bg-white text-[#181818] hover:border-[#0176D3]'
            )}
          >
            All ({opportunities.length})
          </button>
          {OPPORTUNITY_STAGES.map((stage) => {
            const stats = pipelineTotals.get(stage);
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(stage)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap',
                  stageFilter === stage
                    ? 'border-[#0176D3] bg-[#0176D3] text-white'
                    : 'border-[#c9c9c9] bg-white text-[#181818] hover:border-[#0176D3]'
                )}
              >
                {stage} ({stats?.count ?? 0})
              </button>
            );
          })}
        </div>

        <div className="rounded border border-[#e5e5e5] bg-white shadow-[0_2px_2px_rgba(0,0,0,0.05)]">
          {isLoading ? (
            <div className="min-h-[280px] flex items-center justify-center text-[#706e6b] text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading opportunities...
            </div>
          ) : error ? (
            <div className="min-h-[280px] flex items-center justify-center text-red-600 text-sm px-4 text-center">
              {error instanceof Error ? error.message : 'Failed to load opportunities'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="min-h-[280px] flex flex-col items-center justify-center text-[#706e6b] text-sm px-4 text-center">
              <p className="font-medium text-[#181818] mb-1">No opportunities found.</p>
              <p className="mb-4">Create your first opportunity to start tracking the pipeline.</p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded bg-[#0176D3] px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="w-4 h-4" /> New Opportunity
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f3f3f3] text-[#706e6b] text-xs uppercase tracking-wide border-b border-[#e5e5e5]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Opportunity Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Account</th>
                    <th className="text-left px-4 py-3 font-semibold">Stage</th>
                    <th className="text-right px-4 py-3 font-semibold">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold">Close Date</th>
                    <th className="text-left px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-[#f3f3f3] hover:bg-[#f3f9ff] cursor-pointer"
                      onClick={() => router.push(`/opportunities/${row.id}`)}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/opportunities/${row.id}`}
                          className="font-semibold text-[#0176D3] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {row.account?.id ? (
                          <Link
                            href={`/brands/${row.account.id}`}
                            className="text-[#0176D3] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.account.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold',
                            stageBadgeClass(row.stage)
                          )}
                        >
                          {row.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatOpportunityCurrency(row.amount ?? 0)}
                      </td>
                      <td className="px-4 py-3">{formatOpportunityDate(row.closeDate)}</td>
                      <td className="px-4 py-3">
                        {row.owner.firstName} {row.owner.lastName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className="w-4 h-4 text-[#706e6b] inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <OpportunityFormDialog
        open={createOpen}
        opportunity={null}
        loading={createMutation.isPending}
        error={createError}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(null);
        }}
        onSave={(payload) => {
          setCreateError(null);
          createMutation.mutate(payload);
        }}
      />
    </div>
  );
}
