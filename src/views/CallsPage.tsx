'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Calendar, Clock, Building2, User2, FileText, X, Loader2,
  BarChart3, Percent, PhoneCall,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiFetch } from '../lib/api';
import { formatDateIST, formatDateTimeIST } from '../lib/locale';
import { useAuthStore } from '../stores/auth.store';
import { Button, Dialog } from '../components/ui';
import { Sheet } from '../components/ui/Sheet';
import { RecordForm } from '../components/RecordForm';
import { cn } from '../lib/utils';

interface CallUser { id: string; firstName: string; lastName: string; role: string }
interface Call {
  id: string;
  direction: string;
  outcome: string | null;
  notes: string | null;
  managerNote: string | null;
  callAt: string;
  followUpDate: string | null;
  recordingUrl: string | null;
  loggedBy: CallUser;
  owner: CallUser;
  contact: { id: string; firstName: string; lastName: string } | null;
  account: { id: string; name: string } | null;
  deal: { id: string; name: string } | null;
}

interface ScopedUser { id: string; firstName: string; lastName: string; role: string }

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  CONNECTED: { label: 'Connected', color: 'bg-green-100 text-green-700' },
  VOICEMAIL: { label: 'Voicemail', color: 'bg-blue-100 text-blue-700' },
  NO_ANSWER: { label: 'No Answer', color: 'bg-slate-100 text-slate-600' },
  BUSY: { label: 'Busy', color: 'bg-orange-100 text-orange-700' },
};

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#94a3b8'];

function CallRow({ call, onClick }: { call: Call; onClick: () => void }) {
  const outcome = call.outcome ? OUTCOME_LABELS[call.outcome] : null;
  const DirectionIcon = call.direction === 'INBOUND' ? PhoneIncoming : PhoneOutgoing;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className="w-full text-left flex items-center gap-4 px-4 py-3.5 border-b border-border/30 hover:bg-muted/40 transition-colors cursor-pointer"
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        call.direction === 'INBOUND' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
      )}>
        <DirectionIcon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {call.contact ? (
            <Link
              href={`/contacts/${call.contact.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-sm text-primary hover:underline"
            >
              {call.contact.firstName} {call.contact.lastName}
            </Link>
          ) : (
            <span className="font-medium text-sm text-foreground">Unknown Contact</span>
          )}
          {outcome && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', outcome.color)}>
              {outcome.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {call.account && (
            <Link
              href={`/brands/${call.account.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-primary hover:underline"
            >
              <Building2 className="w-3 h-3" /> {call.account.name}
            </Link>
          )}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateTimeIST(call.callAt)}</span>
          {call.followUpDate && (
            <span className="flex items-center gap-1 text-amber-600"><Calendar className="w-3 h-3" /> Follow-up {formatDateIST(call.followUpDate)}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">{call.loggedBy.firstName} {call.loggedBy.lastName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{call.direction}</p>
      </div>
    </div>
  );
}

function CallDetailPanel({ call, onClose }: { call: Call; onClose: () => void }) {
  const DirectionIcon = call.direction === 'INBOUND' ? PhoneIncoming : PhoneOutgoing;
  const outcome = call.outcome ? OUTCOME_LABELS[call.outcome] : null;

  return (
    <Sheet open onClose={onClose} title="Call Details">
      <div className="px-6 py-4 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
            call.direction === 'INBOUND' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
          )}>
            <DirectionIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">
              {call.contact ? (
                <Link href={`/contacts/${call.contact.id}`} className="text-primary hover:underline">
                  {call.contact.firstName} {call.contact.lastName}
                </Link>
              ) : 'Unknown Contact'}
            </h3>
            {call.account && (
              <Link href={`/brands/${call.account.id}`} className="text-sm text-primary hover:underline">
                {call.account.name}
              </Link>
            )}
            <div className="flex items-center gap-2 mt-1">
              {outcome && <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', outcome.color)}>{outcome.label}</span>}
              <span className="text-xs text-muted-foreground">{call.direction}</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Call Date & Time</p>
            <p className="text-sm font-medium text-foreground">{formatDateTimeIST(call.callAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Logged By</p>
            <p className="text-sm font-medium text-foreground">{call.loggedBy.firstName} {call.loggedBy.lastName}</p>
          </div>
          {call.followUpDate && (
            <div>
              <p className="text-xs text-muted-foreground">Follow-Up Date</p>
              <p className="text-sm font-medium text-amber-600">{formatDateIST(call.followUpDate)}</p>
            </div>
          )}
          {call.deal && (
            <div>
              <p className="text-xs text-muted-foreground">Related Deal</p>
              <p className="text-sm font-medium text-foreground">{call.deal.name}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {call.notes && (
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Call Notes</h4>
            <div className="bg-muted/40 rounded-xl p-3 text-sm text-foreground whitespace-pre-wrap">{call.notes}</div>
          </section>
        )}

        {call.managerNote && (
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Manager Note</h4>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-foreground">{call.managerNote}</div>
          </section>
        )}

        {/* Recording */}
        {call.recordingUrl && (
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recording</h4>
            <audio controls src={call.recordingUrl} className="w-full" />
          </section>
        )}
      </div>
    </Sheet>
  );
}

export function CallsPage() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [analyticsUser, setAnalyticsUser] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['calls', outcomeFilter, dateFrom, dateTo, ownerFilter],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '100' });
      if (outcomeFilter) p.set('outcome', outcomeFilter);
      if (dateFrom) p.set('dateFrom', dateFrom);
      if (dateTo) p.set('dateTo', dateTo);
      if (ownerFilter) p.set('ownerId', ownerFilter);
      return apiFetch<{ data: Call[]; scope: string }>(`/calls?${p}`);
    },
  });

  const { data: scopedUsers } = useQuery({
    queryKey: ['scoped-users'],
    queryFn: () => apiFetch<{ data: ScopedUser[] }>('/users?limit=100'),
    enabled: user?.role !== 'INTERN',
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['call-analytics', analyticsPeriod, analyticsUser],
    queryFn: () => {
      const p = new URLSearchParams({ period: analyticsPeriod });
      if (analyticsUser) p.set('userId', analyticsUser);
      return apiFetch<{ data: { total: number; connected: number; connectionRate: number; outcomes: { outcome: string; count: number }[]; daily: { date: string; count: number }[] } }>(`/calls/analytics?${p}`);
    },
    enabled: user?.role !== 'INTERN',
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/calls', {
        method: 'POST',
        body: JSON.stringify({
          direction: body.direction || 'OUTBOUND',
          outcome: body.outcome || undefined,
          notes: body.notes || undefined,
          callAt: body.callAt || undefined,
          followUpDate: body.followUpDate || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setCreateOpen(false);
    },
  });

  const calls = data?.data ?? [];
  const analytics = analyticsData?.data;
  const users = scopedUsers?.data ?? [];
  const showAnalytics = user?.role !== 'INTERN';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calls</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.scope && `Viewing: ${data.scope === 'self' ? 'My Records' : data.scope === 'team' ? 'My Team' : 'Org-Wide'}`}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Log Call
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3">
          <select
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All Outcomes</option>
            <option value="CONNECTED">Connected</option>
            <option value="VOICEMAIL">Voicemail</option>
            <option value="NO_ANSWER">No Answer</option>
            <option value="BUSY">Busy</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="To date"
          />
          {user?.role !== 'INTERN' && (
            <select
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          )}
          {(outcomeFilter || dateFrom || dateTo || ownerFilter) && (
            <button
              type="button"
              onClick={() => { setOutcomeFilter(''); setDateFrom(''); setDateTo(''); setOwnerFilter(''); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Call log list */}
        <div className="bg-card mx-6 mt-4 rounded-2xl border border-border/60 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-border/30">
              {Array.from({length: 6}).map((_, i) => (
                <div key={i} className="h-16 bg-muted/20 animate-pulse mx-4 my-2 rounded-xl" />
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Phone className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No calls logged</p>
              <p className="text-sm mt-1">Log your first call using the button above</p>
            </div>
          ) : (
            calls.map(call => (
              <CallRow key={call.id} call={call} onClick={() => setSelectedCall(call)} />
            ))
          )}
        </div>

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="mx-6 mt-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold text-foreground">Call Analytics</h2>
              </div>
              <div className="flex gap-2">
                {(['week', 'month', 'quarter'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setAnalyticsPeriod(p)}
                    className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                      analyticsPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Quarter'}
                  </button>
                ))}
              </div>
            </div>

            {user?.role !== 'INTERN' && (
              <select
                value={analyticsUser}
                onChange={e => setAnalyticsUser(e.target.value)}
                className="mb-4 px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All (Scoped)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            )}

            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-card border border-border/60 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                    <PhoneCall className="w-4 h-4" /> Total Calls
                  </div>
                  <p className="text-3xl font-extrabold text-foreground">{analytics.total}</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                    <Phone className="w-4 h-4 text-green-500" /> Connected
                  </div>
                  <p className="text-3xl font-extrabold text-foreground">{analytics.connected}</p>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                    <Percent className="w-4 h-4 text-indigo-500" /> Connection Rate
                  </div>
                  <p className="text-3xl font-extrabold text-foreground">{analytics.connectionRate}%</p>
                </div>
              </div>
            )}

            {analytics && analytics.outcomes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border/60 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-foreground mb-3">Outcome Breakdown</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.outcomes} dataKey="count" nameKey="outcome" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                          {analytics.outcomes.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgb(var(--border))', background: 'rgb(var(--card))' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-card border border-border/60 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-foreground mb-3">Calls per Day (30 days)</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.daily.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgb(var(--border))', background: 'rgb(var(--card))' }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Call detail slide-in */}
      {selectedCall && <CallDetailPanel call={selectedCall} onClose={() => setSelectedCall(null)} />}

      {/* Create call form */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Log Call">
        <RecordForm
          fields={[
            {
              name: 'direction', label: 'Direction', type: 'select', required: true,
              options: [
                { value: 'OUTBOUND', label: 'Outbound' },
                { value: 'INBOUND', label: 'Inbound' },
              ],
            },
            {
              name: 'outcome', label: 'Outcome', type: 'select',
              options: [
                { value: 'CONNECTED', label: 'Connected' },
                { value: 'VOICEMAIL', label: 'Voicemail' },
                { value: 'NO_ANSWER', label: 'No Answer' },
                { value: 'BUSY', label: 'Busy' },
              ],
            },
            { name: 'callAt', label: 'Call Date & Time', type: 'datetime-local' },
            { name: 'notes', label: 'Call Notes / Summary', type: 'textarea' },
            { name: 'followUpDate', label: 'Follow-Up Call Date (optional)', type: 'date' },
          ]}
          loading={createMutation.isPending}
          submitLabel="Log Call"
          onSubmit={values => createMutation.mutate(values as unknown as Record<string, string>)}
        />
      </Dialog>
    </div>
  );
}
