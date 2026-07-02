'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, BarChart3, Users2, Building2, Trophy, FileDown, Loader2, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { apiFetch } from '../lib/api';
import { formatCurrencyINR } from '../lib/locale';
import { buildReportSearchParams, type ReportFilters } from '../lib/report-query';
import { downloadCsv } from '../lib/report-csv';
import { useAuthStore } from '../stores/auth.store';
import { cn } from '../lib/utils';

const REPORT_TABS = [
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'activity', label: 'Activity', icon: BarChart3 },
  { id: 'contacts', label: 'Contacts', icon: Users2 },
  { id: 'brands', label: 'Brands', icon: Building2 },
  { id: 'team', label: 'Team', icon: Trophy },
] as const;
type ReportTab = (typeof REPORT_TABS)[number]['id'];

const DATE_RANGES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
];

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

interface ScopedUser { id: string; firstName: string; lastName: string; role: string }

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-extrabold mt-1', color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5">
      <p className="text-sm font-semibold text-foreground mb-4">{title}</p>
      {children}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-muted-foreground">
      <p>{message}</p>
    </div>
  );
}

function CompareHint({ current, previous, label }: { current: number; previous?: number; label: string }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  const pct = previous ? Math.round((diff / previous) * 100) : 0;
  return (
    <span className={cn('text-xs', diff >= 0 ? 'text-green-600' : 'text-red-500')}>
      {diff >= 0 ? '↑' : '↓'} {Math.abs(pct)}% vs prev {label}
    </span>
  );
}

// --- Sales ---
function SalesReportView({ filters }: { filters: ReportFilters }) {
  const qs = buildReportSearchParams(filters);
  const { data, isLoading } = useQuery({
    queryKey: ['report-sales', qs],
    queryFn: () => apiFetch<{ data: SalesReport }>(`/reports/sales?${qs}`),
  });
  if (isLoading) return <LoadingPanel />;
  const r = data?.data;
  if (!r) return <EmptyPanel message="No sales data" />;

  const s = r.summary;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Pipeline Value" value={formatCurrencyINR(s.pipelineValue)} color="text-indigo-600" sub={r.comparison ? undefined : undefined} />
        <StatCard label="Revenue Won" value={formatCurrencyINR(s.revenueWon)} color="text-green-600" />
        <StatCard label="Revenue Lost" value={formatCurrencyINR(s.revenueLost)} color="text-red-500" />
        <StatCard label="Forecast" value={formatCurrencyINR(s.forecast)} color="text-violet-600" />
        <StatCard label="Win Rate" value={`${s.winRate}%`} />
        <StatCard label="Avg Cycle" value={`${s.avgCycleLength}d`} />
      </div>

      {r.comparison && (
        <p className="text-xs text-muted-foreground">
          Compared to previous period — Won: <CompareHint current={s.revenueWon} previous={r.comparison.revenueWon} label="revenue" /> · Deals: {s.dealCount} vs {r.comparison.dealCount}
        </p>
      )}

      {r.byPeriod.length > 0 && (
        <Section title="Revenue by Period">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.byPeriod}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatCurrencyINR(Number(v)), 'Revenue']} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {r.byStage.length > 0 && (
        <Section title="Pipeline by Stage">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Stage</th>
                  <th className="py-2 pr-4">Deals</th>
                  <th className="py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {r.byStage.map((st) => (
                  <tr key={st.name} className="border-b border-border/20">
                    <td className="py-2 pr-4 text-muted-foreground">{st.order}</td>
                    <td className="py-2 pr-4 font-medium">{st.name}</td>
                    <td className="py-2 pr-4">{st.count}</td>
                    <td className="py-2">{formatCurrencyINR(st.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {r.stageConversion.length > 0 && (
        <Section title="Stage Conversion">
          <div className="space-y-2">
            {r.stageConversion.filter((c) => c.fromCount > 0).map((c) => (
              <div key={c.from} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate text-muted-foreground">{c.from}</span>
                <span className="text-muted-foreground">→</span>
                <span className="w-32 truncate">{c.to}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[120px]">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(c.rate, 100)}%` }} />
                </div>
                <span className="text-xs font-semibold w-10">{c.rate}%</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.topBrands.length > 0 && (
        <Section title="Top Brands by Pipeline">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40">
                  <th className="text-left py-2">Brand</th>
                  <th className="text-right py-2">Deals</th>
                  <th className="text-right py-2">Pipeline</th>
                  <th className="text-right py-2">Won</th>
                </tr>
              </thead>
              <tbody>
                {r.topBrands.map((b) => (
                  <tr key={b.id} className="border-b border-border/20">
                    <td className="py-2 font-medium">{b.name}</td>
                    <td className="py-2 text-right">{b.dealCount}</td>
                    <td className="py-2 text-right">{formatCurrencyINR(b.value)}</td>
                    <td className="py-2 text-right text-green-600">{formatCurrencyINR(b.wonValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {r.stuckDeals.length > 0 && (
        <Section title="Stuck Deals (14+ days in stage)">
          <div className="space-y-2">
            {r.stuckDeals.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-xl text-sm">
                <span className="font-medium">{d.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{d.stage}</span>
                <span className="text-muted-foreground">{d.owner}</span>
                <span className="text-muted-foreground">{d.daysStuck}d stuck</span>
                <span className="font-semibold ml-auto">{formatCurrencyINR(d.value)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

interface SalesReport {
  summary: {
    pipelineValue: number; revenueWon: number; revenueLost: number; forecast: number;
    avgCycleLength: number; dealCount: number; winRate: number;
  };
  comparison?: { revenueWon: number; dealCount: number };
  byPeriod: { label: string; revenue: number; count: number }[];
  byStage: { name: string; order: number; count: number; value: number }[];
  stageConversion: { from: string; to: string; fromCount: number; toCount: number; rate: number }[];
  topBrands: { id: string; name: string; dealCount: number; value: number; wonValue: number }[];
  stuckDeals: { id: string; name: string; stage: string; owner: string; value: number; daysStuck: number }[];
}

// --- Activity ---
function ActivityReportView({ filters }: { filters: ReportFilters }) {
  const qs = buildReportSearchParams(filters);
  const { data, isLoading } = useQuery({
    queryKey: ['report-activity', qs],
    queryFn: () => apiFetch<{ data: ActivityReport }>(`/reports/activity?${qs}`),
  });
  if (isLoading) return <LoadingPanel />;
  const report = data?.data;
  if (!report) return <EmptyPanel message="No activity data" />;

  const totalCalls = report.calls.reduce((a, b) => a + b.count, 0);
  const totalEmails = report.emails.reduce((a, b) => a + b.count, 0);
  const totalTasks = report.tasks.reduce((a, b) => a + b.count, 0);
  const maxLen = Math.max(report.calls.length, report.emails.length, report.tasks.length);
  const merged = Array.from({ length: maxLen }, (_, i) => ({
    date: (report.calls[i] ?? report.emails[i] ?? report.tasks[i])?.date ?? '',
    calls: report.calls[i]?.count ?? 0,
    emails: report.emails[i]?.count ?? 0,
    tasks: report.tasks[i]?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Calls" value={totalCalls} color="text-orange-500" />
        <StatCard label="Emails" value={totalEmails} color="text-indigo-500" />
        <StatCard label="Tasks Done" value={totalTasks} color="text-green-500" />
        <StatCard label="Meetings" value={report.meetingsSet} color="text-violet-500" />
      </div>

      {merged.length > 0 && (
        <Section title="Activity Trend">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={merged.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="emails" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="tasks" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.callOutcomes.length > 0 && (
          <Section title="Call Outcomes">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={report.callOutcomes} dataKey="count" nameKey="outcome" cx="50%" cy="50%" outerRadius={70} label={(p) => `${(p as { outcome?: string }).outcome ?? ''}`}>
                    {report.callOutcomes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}
        {report.byType.length > 0 && (
          <Section title="Task Types">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={report.byType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={70}>
                    {report.byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}
      </div>

      {report.byUser.length > 0 && (
        <Section title="Activity by Person">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40">
                  <th className="text-left py-2">Person</th>
                  <th className="text-right py-2">Calls</th>
                  <th className="text-right py-2">Emails</th>
                  <th className="text-right py-2">Tasks</th>
                </tr>
              </thead>
              <tbody>
                {report.byUser.map((u) => (
                  <tr key={u.userId} className="border-b border-border/20">
                    <td className="py-2 font-medium">{u.name}</td>
                    <td className="py-2 text-right">{u.calls}</td>
                    <td className="py-2 text-right">{u.emails}</td>
                    <td className="py-2 text-right">{u.tasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

interface ActivityReport {
  calls: { date: string; count: number }[];
  emails: { date: string; count: number }[];
  tasks: { date: string; count: number }[];
  byType: { type: string; count: number }[];
  callOutcomes: { outcome: string; count: number }[];
  meetingsSet: number;
  byUser: { userId: string; name: string; calls: number; emails: number; tasks: number }[];
}

// --- Contacts ---
function ContactReportView({ filters }: { filters: ReportFilters }) {
  const qs = buildReportSearchParams(filters);
  const { data, isLoading } = useQuery({
    queryKey: ['report-contacts', qs],
    queryFn: () => apiFetch<{ data: ContactReport }>(`/reports/contacts?${qs}`),
  });
  if (isLoading) return <LoadingPanel />;
  const report = data?.data;
  if (!report) return <EmptyPanel message="No contact data" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Brand POCs" value={report.linkedVsStandalone.linkedToBrand} color="text-indigo-600" />
        <StatCard label="Standalone" value={report.linkedVsStandalone.standalone} />
        <StatCard label="Total New" value={report.linkedVsStandalone.linkedToBrand + report.linkedVsStandalone.standalone} />
      </div>

      {report.overTime.length > 0 && (
        <Section title="New Contacts Over Time">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.byIndustry.length > 0 && (
          <Section title="By Industry">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.byIndustry.slice(0, 8)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="industry" type="category" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}
        {report.byStatus.length > 0 && (
          <Section title="By Status">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={report.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70}>
                    {report.byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </Section>
        )}
      </div>

      {report.byBrand.length > 0 && (
        <Section title="Contacts by Brand">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40">
                  <th className="text-left py-2">Brand</th>
                  <th className="text-right py-2">POCs</th>
                </tr>
              </thead>
              <tbody>
                {report.byBrand.map((b) => (
                  <tr key={b.brand} className="border-b border-border/20">
                    <td className="py-2 font-medium">{b.brand}</td>
                    <td className="py-2 text-right">{b.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

interface ContactReport {
  overTime: { date: string; count: number }[];
  byIndustry: { industry: string; count: number }[];
  byStatus: { status: string; count: number }[];
  linkedVsStandalone: { linkedToBrand: number; standalone: number };
  byBrand: { brand: string; count: number }[];
}

// --- Brands ---
function BrandsReportView({ filters }: { filters: ReportFilters }) {
  const qs = buildReportSearchParams(filters);
  const { data, isLoading } = useQuery({
    queryKey: ['report-brands', qs],
    queryFn: () => apiFetch<{ data: BrandsReport }>(`/reports/brands?${qs}`),
  });
  if (isLoading) return <LoadingPanel />;
  const report = data?.data;
  if (!report) return <EmptyPanel message="No brand data" />;

  return (
    <div className="space-y-6">
      <StatCard label="New Brands in Period" value={report.newBrandsCount} color="text-indigo-600" />

      {report.brandsAddedOverTime.length > 0 && (
        <Section title="Brands Added Over Time">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.brandsAddedOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {report.byIndustry.length > 0 && (
        <Section title="Industry Mix">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.byIndustry.slice(0, 10)}>
                <XAxis dataKey="industry" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {report.topByPocs.length > 0 && (
          <Section title="Top Brands by POCs">
            <div className="space-y-2">
              {report.topByPocs.map((b) => (
                <div key={b.id} className="flex justify-between text-sm py-1 border-b border-border/20">
                  <span className="font-medium truncate">{b.name}</span>
                  <span className="text-muted-foreground">{b.pocCount} POCs</span>
                </div>
              ))}
            </div>
          </Section>
        )}
        {report.topByDeals.length > 0 && (
          <Section title="Top Brands by Deals">
            <div className="space-y-2">
              {report.topByDeals.map((b) => (
                <div key={b.id} className="flex justify-between text-sm py-1 border-b border-border/20 gap-2">
                  <span className="font-medium truncate">{b.name}</span>
                  <span className="text-muted-foreground shrink-0">{b.dealCount} · {formatCurrencyINR(b.value)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

interface BrandsReport {
  brandsAddedOverTime: { date: string; count: number }[];
  byIndustry: { industry: string; count: number }[];
  newBrandsCount: number;
  topByPocs: { id: string; name: string; pocCount: number }[];
  topByDeals: { id: string; name: string; dealCount: number; value: number }[];
}

// --- Team ---
function TeamReportView({ filters, isBoss }: { filters: ReportFilters; isBoss: boolean }) {
  const qs = buildReportSearchParams(filters);
  const { data: prodData, isLoading: prodLoading } = useQuery({
    queryKey: ['report-team', qs],
    queryFn: () => apiFetch<{ data: { team: TeamRow[] } }>(`/reports/team-productivity?${qs}`),
  });
  const { data: mgrData } = useQuery({
    queryKey: ['report-managers'],
    queryFn: () => apiFetch<{ data: { managers: ManagerRow[] } }>('/reports/manager-comparison'),
    enabled: isBoss,
  });
  const { data: lbData } = useQuery({
    queryKey: ['report-leaderboard', filters.period],
    queryFn: () => apiFetch<{ data: { rows: LeaderboardRow[] } }>(`/reports/leaderboard?period=${filters.period}`),
  });

  if (prodLoading) return <LoadingPanel />;
  const team = prodData?.data?.team ?? [];

  return (
    <div className="space-y-6">
      {lbData?.data?.rows && lbData.data.rows.length > 0 && (
        <Section title="Leaderboard Snapshot">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40">
                  <th className="text-left py-2">#</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-right py-2">Deals</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Calls</th>
                  <th className="text-right py-2">Emails</th>
                </tr>
              </thead>
              <tbody>
                {lbData.data.rows.slice(0, 10).map((row) => (
                  <tr key={row.user.id} className="border-b border-border/20">
                    <td className="py-2">{row.rank}</td>
                    <td className="py-2 font-medium">{row.user.firstName} {row.user.lastName}</td>
                    <td className="py-2 text-right">{row.showNumbers ? row.dealsClosed ?? '—' : '—'}</td>
                    <td className="py-2 text-right">{row.showNumbers && row.revenue != null ? formatCurrencyINR(row.revenue) : '—'}</td>
                    <td className="py-2 text-right">{row.showNumbers ? row.callsMade ?? '—' : '—'}</td>
                    <td className="py-2 text-right">{row.showNumbers ? row.emailsSent ?? '—' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {team.length > 0 && (
        <Section title="Team Productivity">
          <div className="h-56 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={team.map((t) => ({ name: `${t.user.firstName} ${t.user.lastName[0]}.`, calls: t.calls, emails: t.emails, tasks: t.tasks }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="calls" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="emails" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tasks" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40">
                  <th className="text-left py-2">Person</th>
                  <th className="text-right py-2">Calls</th>
                  <th className="text-right py-2">Emails</th>
                  <th className="text-right py-2">Tasks</th>
                  <th className="text-right py-2">Meetings</th>
                  <th className="text-right py-2">Deals Won</th>
                </tr>
              </thead>
              <tbody>
                {team.map((t) => (
                  <tr key={t.user.id} className="border-b border-border/20">
                    <td className="py-2 font-medium">{t.user.firstName} {t.user.lastName}</td>
                    <td className="py-2 text-right">{t.calls}</td>
                    <td className="py-2 text-right">{t.emails}</td>
                    <td className="py-2 text-right">{t.tasks}</td>
                    <td className="py-2 text-right">{t.meetings}</td>
                    <td className="py-2 text-right text-green-600">{t.dealsWon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {isBoss && mgrData?.data?.managers && mgrData.data.managers.length > 0 && (
        <Section title="Manager Comparison">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/40">
                  <th className="text-left py-2">Manager</th>
                  <th className="text-right py-2">Team Deals</th>
                  <th className="text-right py-2">Pipeline Value</th>
                </tr>
              </thead>
              <tbody>
                {mgrData.data.managers.map((m) => (
                  <tr key={m.manager.id} className="border-b border-border/20">
                    <td className="py-2 font-medium">{m.manager.firstName} {m.manager.lastName}</td>
                    <td className="py-2 text-right">{m.dealCount}</td>
                    <td className="py-2 text-right">{formatCurrencyINR(Number(m.pipelineValue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

interface TeamRow {
  user: { id: string; firstName: string; lastName: string; role: string };
  tasks: number; calls: number; emails: number; meetings: number; dealsWon: number;
}
interface ManagerRow {
  manager: { id: string; firstName: string; lastName: string };
  dealCount: number; pipelineValue: unknown;
}
interface LeaderboardRow {
  rank: number;
  user: { id: string; firstName: string; lastName: string };
  showNumbers: boolean;
  dealsClosed: number | null;
  revenue: number | null;
  callsMade: number | null;
  emailsSent: number | null;
}

// --- Main ---
export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<ReportTab>('sales');
  const [period, setPeriod] = useState('30d');
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [compare, setCompare] = useState(false);

  const filters: ReportFilters = {
    period,
    useCustomRange,
    customStart,
    customEnd,
    userId: filterUserId,
    compare,
  };

  const { data: scopedUsers } = useQuery({
    queryKey: ['scoped-users'],
    queryFn: () => apiFetch<{ data: ScopedUser[] }>('/users?limit=200'),
    enabled: user?.role !== 'INTERN',
  });

  const showPersonFilter = user?.role !== 'INTERN';
  const isBoss = user?.role === 'BOSS' || user?.role === 'ADMIN';

  async function handleExport() {
    const qs = buildReportSearchParams(filters);
    try {
      if (tab === 'sales') {
        const res = await apiFetch<{ data: SalesReport }>(`/reports/sales?${qs}`);
        const r = res.data;
        downloadCsv('sales-report.csv', [
          ...r.byStage.map((s) => ({ Stage: s.name, Deals: s.count, Value: s.value })),
          ...r.topBrands.map((b) => ({ Brand: b.name, Deals: b.dealCount, Pipeline: b.value, Won: b.wonValue })),
        ]);
      } else if (tab === 'activity') {
        const res = await apiFetch<{ data: ActivityReport }>(`/reports/activity?${qs}`);
        downloadCsv('activity-report.csv', res.data.byUser.map((u) => ({
          Person: u.name, Calls: u.calls, Emails: u.emails, Tasks: u.tasks,
        })));
      } else if (tab === 'contacts') {
        const res = await apiFetch<{ data: ContactReport }>(`/reports/contacts?${qs}`);
        downloadCsv('contacts-report.csv', [
          ...res.data.byBrand.map((b) => ({ Brand: b.brand, POCs: b.count })),
          ...res.data.byStatus.map((s) => ({ Status: s.status, Count: s.count })),
        ]);
      } else if (tab === 'brands') {
        const res = await apiFetch<{ data: BrandsReport }>(`/reports/brands?${qs}`);
        downloadCsv('brands-report.csv', res.data.topByDeals.map((b) => ({
          Brand: b.name, Deals: b.dealCount, Value: b.value,
        })));
      } else if (tab === 'team') {
        const res = await apiFetch<{ data: { team: TeamRow[] } }>(`/reports/team-productivity?${qs}`);
        downloadCsv('team-report.csv', res.data.team.map((t) => ({
          Person: `${t.user.firstName} ${t.user.lastName}`,
          Calls: t.calls, Emails: t.emails, Tasks: t.tasks, Meetings: t.meetings, DealsWon: t.dealsWon,
        })));
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <button
            type="button"
            onClick={() => void handleExport()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {!useCustomRange ? (
            <div className="flex border border-border/60 rounded-xl overflow-hidden">
              {DATE_RANGES.map((r) => (
                <button key={r.value} type="button" onClick={() => setPeriod(r.value)}
                  className={cn('px-3 py-1.5 text-xs font-medium transition-colors', period === r.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                  {r.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1.5 text-sm border border-border/60 rounded-lg bg-card" />
              <span className="text-muted-foreground text-sm">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1.5 text-sm border border-border/60 rounded-lg bg-card" />
            </div>
          )}
          <button type="button" onClick={() => setUseCustomRange((p) => !p)}
            className="text-xs text-primary hover:underline">
            {useCustomRange ? 'Use presets' : 'Custom range'}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="rounded" />
            Compare to previous period
          </label>
          {showPersonFilter && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground">
                <option value="">All ({isBoss ? 'Org-Wide' : 'My Team'})</option>
                {(scopedUsers?.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-1 flex-wrap">
          {REPORT_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                tab === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted')}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'sales' && <SalesReportView filters={filters} />}
        {tab === 'activity' && <ActivityReportView filters={filters} />}
        {tab === 'contacts' && <ContactReportView filters={filters} />}
        {tab === 'brands' && <BrandsReportView filters={filters} />}
        {tab === 'team' && <TeamReportView filters={filters} isBoss={isBoss} />}
      </div>
    </div>
  );
}
