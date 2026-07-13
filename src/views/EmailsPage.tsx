'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Mail, MailOpen, X, Clock, Building2, BarChart3, Loader2,
  Send, Percent, TrendingUp, Eye, MousePointerClick,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { apiFetch } from '../lib/api';
import { formatDateIST, formatDateTimeIST } from '../lib/locale';
import { useAuthStore } from '../stores/auth.store';
import { Button, Dialog } from '../components/ui';
import { Sheet } from '../components/ui/Sheet';
import { RecordForm } from '../components/RecordForm';
import { cn } from '../lib/utils';

interface EmailUser { id: string; firstName: string; lastName: string; role: string }
interface Email {
  id: string;
  subject: string;
  body: string;
  toEmails: string[];
  ccEmails: string[];
  sentAt: string | null;
  scheduledAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  followUpDate: string | null;
  sentBy: EmailUser;
  owner: EmailUser;
  contact: { id: string; firstName: string; lastName: string } | null;
  account: { id: string; name: string } | null;
  deal: { id: string; name: string } | null;
}

interface ScopedUser { id: string; firstName: string; lastName: string; role: string }

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  opened: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-amber-100 text-amber-700',
  draft: 'bg-slate-100 text-slate-600',
};

function getEmailStatus(email: Email) {
  if (email.openedAt) return 'opened';
  if (email.sentAt) return 'sent';
  if (email.scheduledAt) return 'scheduled';
  return 'draft';
}

function EmailRow({ email, onClick }: { email: Email; onClick: () => void }) {
  const status = getEmailStatus(email);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      className="w-full text-left flex items-center gap-4 px-4 py-3.5 border-b border-border/30 hover:bg-muted/40 transition-colors cursor-pointer"
    >
      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
        {email.openedAt ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground truncate">{email.subject || '(No Subject)'}</span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', STATUS_STYLES[status])}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>To: {email.toEmails[0] ?? '—'}</span>
          {email.contact && (
            <Link href={`/contacts/${email.contact.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">
              {email.contact.firstName} {email.contact.lastName}
            </Link>
          )}
          {email.account && (
            <Link href={`/brands/${email.account.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary hover:underline">
              <Building2 className="w-3 h-3" /> {email.account.name}
            </Link>
          )}
          {email.sentAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateIST(email.sentAt)}</span>}
          {email.followUpDate && <span className="text-amber-600">Follow-up {formatDateIST(email.followUpDate)}</span>}
        </div>
      </div>
      <div className="text-right shrink-0 text-xs text-muted-foreground">
        <p>{email.sentBy.firstName} {email.sentBy.lastName}</p>
      </div>
    </div>
  );
}

function EmailDetailPanel({ email, onClose }: { email: Email; onClose: () => void }) {
  const status = getEmailStatus(email);
  return (
    <Sheet open onClose={onClose} title="Email Details">
      <div className="px-6 py-4 space-y-5">
        <div>
          <h3 className="text-lg font-bold text-foreground">{email.subject}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[status])}>{status}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">To</p>
            <p className="font-medium text-foreground">{email.toEmails.join(', ')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">From</p>
            <p className="font-medium text-foreground">{email.sentBy.firstName} {email.sentBy.lastName}</p>
          </div>
          {email.contact && (
            <div>
              <p className="text-xs text-muted-foreground">Contact</p>
              <Link href={`/contacts/${email.contact.id}`} className="font-medium text-primary hover:underline">
                {email.contact.firstName} {email.contact.lastName}
              </Link>
            </div>
          )}
          {email.account && (
            <div>
              <p className="text-xs text-muted-foreground">Brand</p>
              <Link href={`/brands/${email.account.id}`} className="font-medium text-primary hover:underline">
                {email.account.name}
              </Link>
            </div>
          )}
          {email.sentAt && (
            <div>
              <p className="text-xs text-muted-foreground">Sent At</p>
              <p className="font-medium text-foreground">{formatDateTimeIST(email.sentAt)}</p>
            </div>
          )}
          {email.openedAt && (
            <div>
              <p className="text-xs text-muted-foreground">Opened At</p>
              <p className="font-medium text-green-600">{formatDateTimeIST(email.openedAt)}</p>
            </div>
          )}
          {email.followUpDate && (
            <div>
              <p className="text-xs text-muted-foreground">Follow-Up</p>
              <p className="font-medium text-amber-600">{formatDateIST(email.followUpDate)}</p>
            </div>
          )}
          {email.deal && (
            <div>
              <p className="text-xs text-muted-foreground">Related Deal</p>
              <p className="font-medium text-foreground">{email.deal.name}</p>
            </div>
          )}
        </div>
        {email.ccEmails.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">CC</p>
            <p className="text-sm text-foreground">{email.ccEmails.join(', ')}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email Body</p>
          <div
            className="bg-muted/30 rounded-xl p-4 text-sm text-foreground max-h-64 overflow-y-auto prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        </div>
      </div>
    </Sheet>
  );
}

export function EmailsPage() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [analyticsUser, setAnalyticsUser] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['emails', statusFilter, dateFrom, dateTo, ownerFilter],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '100' });
      if (statusFilter) p.set('status', statusFilter);
      if (dateFrom) p.set('dateFrom', dateFrom);
      if (dateTo) p.set('dateTo', dateTo);
      if (ownerFilter) p.set('ownerId', ownerFilter);
      return apiFetch<{ data: Email[]; scope: string }>(`/emails?${p}`);
    },
  });

  const { data: scopedUsers } = useQuery({
    queryKey: ['scoped-users'],
    queryFn: () => apiFetch<{ data: ScopedUser[] }>('/users?limit=100'),
    enabled: user?.role !== 'INTERN',
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['email-analytics', analyticsPeriod, analyticsUser],
    queryFn: () => {
      const p = new URLSearchParams({ period: analyticsPeriod });
      if (analyticsUser) p.set('userId', analyticsUser);
      return apiFetch<{ data: { total: number; opened: number; clicked: number; openRate: number; clickRate: number; daily: { date: string; count: number }[] } }>(`/emails/analytics?${p}`);
    },
    enabled: user?.role !== 'INTERN',
  });

  const sendMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/emails/send', {
        method: 'POST',
        body: JSON.stringify({
          subject: body.subject,
          body: body.body,
          toEmails: body.to ? [body.to] : [],
          ccEmails: body.cc ? body.cc.split(',').map((e: string) => e.trim()) : [],
          followUpDate: body.followUpDate || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setComposeOpen(false);
    },
  });

  const emails = data?.data ?? [];
  const analytics = analyticsData?.data;
  const users = scopedUsers?.data ?? [];
  const showAnalytics = user?.role !== 'INTERN';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Emails</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.scope && `Viewing: ${data.scope === 'self' ? 'My Records' : data.scope === 'team' ? 'My Team' : 'Org-Wide'}`}
            </p>
          </div>
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Compose
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          {user?.role !== 'INTERN' && (
            <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">All Users</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          )}
          {(statusFilter || dateFrom || dateTo || ownerFilter) && (
            <button type="button" onClick={() => { setStatusFilter(''); setDateFrom(''); setDateTo(''); setOwnerFilter(''); }} className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-card mx-6 mt-4 rounded-2xl border border-border/60 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-border/30">
              {Array.from({length: 5}).map((_, i) => <div key={i} className="h-16 bg-muted/20 animate-pulse mx-4 my-2 rounded-xl" />)}
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Mail className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No emails logged</p>
              <p className="text-sm mt-1">Compose your first email using the button above</p>
            </div>
          ) : (
            emails.map(email => (
              <EmailRow key={email.id} email={email} onClick={() => setSelectedEmail(email)} />
            ))
          )}
        </div>

        {showAnalytics && (
          <div className="mx-6 mt-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold text-foreground">Email Analytics</h2>
              </div>
              <div className="flex gap-1">
                {(['week', 'month', 'quarter'] as const).map(p => (
                  <button key={p} onClick={() => setAnalyticsPeriod(p)}
                    className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors', analyticsPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                    {p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Quarter'}
                  </button>
                ))}
              </div>
            </div>
            {user?.role !== 'INTERN' && (
              <select value={analyticsUser} onChange={e => setAnalyticsUser(e.target.value)} className="mb-4 px-3 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">All (Scoped)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </select>
            )}
            {analytics && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { icon: Send, label: 'Total Sent', value: analytics.total, color: 'text-indigo-500' },
                    { icon: Eye, label: 'Opened', value: analytics.opened, color: 'text-green-500' },
                    { icon: MousePointerClick, label: 'Clicked', value: analytics.clicked, color: 'text-blue-500' },
                    { icon: TrendingUp, label: 'Open Rate', value: `${analytics.openRate}%`, color: 'text-amber-500' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-card border border-border/60 rounded-2xl p-4">
                      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground mb-2')}><stat.icon className={cn('w-4 h-4', stat.color)} /> {stat.label}</div>
                      <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                    </div>
                  ))}
                </div>
                {analytics.daily.length > 0 && (
                  <div className="bg-card border border-border/60 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">Emails Sent per Day (30 days)</p>
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
                )}
              </>
            )}
          </div>
        )}
      </div>

      {selectedEmail && <EmailDetailPanel email={selectedEmail} onClose={() => setSelectedEmail(null)} />}

      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} title="Compose Email">
        <RecordForm
          fields={[
            { name: 'to', label: 'To (email)', type: 'email', required: true },
            { name: 'cc', label: 'CC (comma separated)' },
            { name: 'subject', label: 'Subject', required: true },
            { name: 'body', label: 'Body', type: 'textarea' },
            { name: 'followUpDate', label: 'Follow-Up Date (optional)', type: 'date' },
          ]}
          loading={sendMutation.isPending}
          submitLabel="Send Email"
          onSubmit={values => sendMutation.mutate(values as unknown as Record<string, string>)}
        />
      </Dialog>
    </div>
  );
}
