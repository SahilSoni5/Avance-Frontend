'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Building2, Handshake, CheckSquare, TrendingUp, Sparkles,
  Trophy, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { Role } from '@crm/shared';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../components/ModulePage';
import { SectionCard } from '../components/ui';
import { cn } from '../lib/utils';

const CHART_COLORS = ['#6366f1', '#818cf8', '#38bdf8', '#a78bfa', '#22d3ee', '#94a3b8'];

const ROLE_STYLES: Record<string, string> = {
  BOSS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
  MANAGER: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30',
  EMPLOYEE: 'bg-slate-100 text-slate-600 dark:bg-slate-700',
  INTERN: 'bg-gray-100 text-gray-600 dark:bg-gray-700',
};

const PERIOD_LABELS: Record<string, string> = {
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
};

type SortKey = 'rank' | 'dealsClosed' | 'revenue' | 'callsMade' | 'emailsSent' | 'meetingsSet';

interface LeaderboardRow {
  rank: number;
  user: { id: string; firstName: string; lastName: string; role: string; email: string };
  showNumbers: boolean;
  dealsClosed: number | null;
  revenue: number | null;
  callsMade: number | null;
  emailsSent: number | null;
  meetingsSet: number | null;
}

const STAT_STYLES = [
  { gradient: 'from-indigo-500 to-violet-600', icon: Users },
  { gradient: 'from-sky-500 to-cyan-600', icon: Building2 },
  { gradient: 'from-emerald-500 to-teal-600', icon: Handshake },
  { gradient: 'from-amber-500 to-orange-600', icon: TrendingUp },
] as const;

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [lbPeriod, setLbPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () =>
      apiFetch<{
        data: {
          contacts: number; accounts: number; deals: number; tasks: number;
          pipelineValue: number; scope: string;
          dealsByStage: Array<{ stageId: string; name?: string; order?: number; color?: string | null; _count: number; _sum: { value: number | null } }>;
        };
      }>('/dashboard/stats'),
  });

  const { data: lbData, isLoading: lbLoading } = useQuery({
    queryKey: ['leaderboard', lbPeriod],
    queryFn: () => apiFetch<{ data: { period: string; rows: LeaderboardRow[]; scope: string } }>(`/leaderboard?period=${lbPeriod}`),
  });

  const stats = statsData?.data;
  const leaderboard = lbData?.data;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const cards = user?.role === Role.INTERN
    ? [
        { title: 'My Contacts', value: stats?.contacts, idx: 0 },
        { title: 'My Opportunities', value: stats?.deals, idx: 2 },
        { title: 'My Tasks', value: stats?.tasks, idx: 3 },
        { title: 'Pipeline Value', value: stats?.pipelineValue ? formatCurrency(stats.pipelineValue) : '—', idx: 1 },
      ]
    : user?.role === Role.EMPLOYEE
      ? [
          { title: 'My Contacts', value: stats?.contacts, idx: 0 },
          { title: 'My Opportunities', value: stats?.deals, idx: 2 },
          { title: 'My Tasks', value: stats?.tasks, idx: 3 },
          { title: 'Pipeline Value', value: stats?.pipelineValue ? formatCurrency(stats.pipelineValue) : '—', idx: 1 },
        ]
      : user?.role === Role.MANAGER
        ? [
            { title: 'Team Contacts', value: stats?.contacts, idx: 0 },
            { title: 'Team Opportunities', value: stats?.deals, idx: 2 },
            { title: 'Team Tasks', value: stats?.tasks, idx: 3 },
            { title: 'Pipeline Value', value: stats?.pipelineValue ? formatCurrency(stats.pipelineValue) : '—', idx: 1 },
          ]
        : [
            { title: 'Total Contacts', value: stats?.contacts, idx: 0 },
            { title: 'Total Brands', value: stats?.accounts, idx: 1 },
            { title: 'Pipeline Value', value: stats?.pipelineValue ? formatCurrency(stats.pipelineValue) : '—', idx: 1 },
            { title: 'Open Opportunities', value: stats?.deals, idx: 2 },
          ];

  const stageData = stats?.dealsByStage?.map((s, i) => ({
    name: s.name ?? 'Unknown',
    order: s.order ?? i + 1,
    count: s._count,
    value: Number(s._sum.value ?? 0),
    fill: s.color ?? CHART_COLORS[i % CHART_COLORS.length],
  })) ?? [];

  const maxStageCount = Math.max(...stageData.map((s) => s.count), 1);

  // Sort leaderboard rows
  const sortedRows = [...(leaderboard?.rows ?? [])].sort((a, b) => {
    if (sortKey === 'rank') return sortAsc ? a.rank - b.rank : b.rank - a.rank;
    const av = (a[sortKey] as number | null) ?? -1;
    const bv = (b[sortKey] as number | null) ?? -1;
    return sortAsc ? av - bv : bv - av;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(p => !p);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
      {/* Hero strip */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/5 to-sky-500/10 border border-primary/10 flex flex-wrap items-center justify-between gap-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{greeting}, {user?.firstName} 👋</p>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? 'Loading your workspace...' : `Viewing ${stats?.scope ?? ''} scope`}
            </p>
          </div>
        </div>
        {stats?.pipelineValue != null && stats.pipelineValue > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total pipeline</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {formatCurrency(stats.pipelineValue)}
            </p>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const style = STAT_STYLES[card.idx % STAT_STYLES.length];
          const Icon = style.icon;
          return (
            <div
              key={card.title}
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-extrabold text-foreground mt-2 tracking-tight">
                    {statsLoading
                      ? <span className="inline-block w-16 h-8 rounded-lg shimmer" />
                      : card.value ?? '—'
                    }
                  </p>
                </div>
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow-md', style.gradient)}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle: Leaderboard + Pipeline side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Leaderboard — 2/3 width */}
        <div className="xl:col-span-2">
          <SectionCard
            title=""
            className="glass-card !rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-foreground">Leaderboard</span>
              </div>
              <div className="flex gap-1">
                {(['week','month','quarter','year'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setLbPeriod(p)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                      lbPeriod === p
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {lbLoading ? (
              <div className="space-y-2">
                {Array.from({length: 5}).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : sortedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40">
                      {[
                        { key: 'rank' as SortKey, label: '#' },
                        { key: 'rank' as SortKey, label: 'Name', noSort: true },
                        { key: 'dealsClosed' as SortKey, label: 'Opportunities' },
                        { key: 'revenue' as SortKey, label: 'Revenue' },
                        { key: 'callsMade' as SortKey, label: 'Calls' },
                        { key: 'meetingsSet' as SortKey, label: 'Meetings' },
                        { key: 'emailsSent' as SortKey, label: 'Emails' },
                      ].map(({ key, label, noSort }) => (
                        <th
                          key={label}
                          className={cn('text-left py-2 px-2 text-xs font-semibold text-muted-foreground', !noSort && 'cursor-pointer hover:text-foreground')}
                          onClick={() => !noSort && toggleSort(key)}
                        >
                          <span className="flex items-center gap-1">
                            {label}
                            {!noSort && <SortIcon col={key} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, i) => (
                      <tr
                        key={row.user.id}
                        className={cn('border-b border-border/20 hover:bg-muted/30 transition-colors', i < 3 && 'font-medium')}
                      >
                        <td className="py-2.5 px-2">
                          {row.rank <= 3 ? (
                            <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                              row.rank === 1 ? 'bg-amber-400 text-white' :
                              row.rank === 2 ? 'bg-slate-300 text-slate-700' :
                              'bg-amber-700/40 text-amber-900'
                            )}>
                              {row.rank}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">{row.rank}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {row.user.firstName[0]}{row.user.lastName[0]}
                            </div>
                            <div>
                              <p className="text-foreground text-xs font-medium leading-tight">{row.user.firstName} {row.user.lastName}</p>
                              <span className={cn('text-[10px] px-1.5 py-px rounded-full font-medium', ROLE_STYLES[row.user.role] ?? 'bg-muted')}>
                                {row.user.role}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {row.showNumbers ? <span className="font-semibold text-foreground">{row.dealsClosed ?? 0}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5 px-2">
                          {row.showNumbers ? <span className="font-semibold text-foreground text-xs">{row.revenue != null ? formatCurrency(row.revenue) : '—'}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {row.showNumbers ? <span className="font-semibold text-foreground">{row.callsMade ?? 0}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {row.showNumbers ? <span className="font-semibold text-foreground">{row.meetingsSet ?? 0}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {row.showNumbers ? <span className="font-semibold text-foreground">{row.emailsSent ?? 0}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Pipeline by Stage — 1/3 width */}
        <div>
          <SectionCard title="Pipeline by Stage" className="glass-card !rounded-2xl">
            {stageData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pipeline data.</p>
            ) : (
              <div className="space-y-2 mt-2">
                {stageData.map((stage) => (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        <span className="text-primary/70 font-semibold mr-1.5">{stage.order}.</span>
                        {stage.name}
                      </span>
                      <span className="text-foreground font-semibold">{stage.count} opportunities</span>
                    </div>
                    <div className="h-7 rounded-lg overflow-hidden bg-muted/40 relative">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{
                          width: `${(stage.count / maxStageCount) * 100}%`,
                          background: stage.fill,
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/80">
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
