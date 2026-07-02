'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Megaphone, Users2, Calendar, BarChart3, Loader2,
  CheckCircle2, XCircle, Clock, Send,
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../lib/api';
import { formatDateIST } from '../lib/locale';
import { useAuthStore } from '../stores/auth.store';
import { Button, Dialog } from '../components/ui';
import { Sheet } from '../components/ui/Sheet';
import { RecordForm } from '../components/RecordForm';
import { cn } from '../lib/utils';

interface CampaignOwner { id: string; firstName: string; lastName: string; role: string }
interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  approvalStatus: string | null;
  startDate: string | null;
  endDate: string | null;
  subject: string | null;
  owner: CampaignOwner;
  _count?: { contacts: number };
}

interface CampaignStats {
  sent: number; delivered: number; opened: number; clicked: number; unsubscribed: number; bounced: number;
  openRate: number; clickRate: number;
}

interface CampaignDetail extends Campaign {
  collaborators?: CampaignOwner[];
  stats?: CampaignStats;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  DRAFT: 'bg-amber-100 text-amber-700',
  PAUSED: 'bg-orange-100 text-orange-700',
  PENDING_APPROVAL: 'bg-blue-100 text-blue-700',
};

const TYPE_STYLES: Record<string, string> = {
  EMAIL_BLAST: 'bg-indigo-100 text-indigo-700',
  DRIP_SEQUENCE: 'bg-violet-100 text-violet-700',
};

const ROLE_STYLES: Record<string, string> = {
  BOSS: 'bg-amber-100 text-amber-700', MANAGER: 'bg-indigo-100 text-indigo-700',
  EMPLOYEE: 'bg-slate-100 text-slate-700', INTERN: 'bg-gray-100 text-gray-600',
};

type CampaignTab = 'active' | 'past' | 'all';

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[campaign.status] ?? 'bg-muted text-muted-foreground')}>
            {campaign.status.replace('_', ' ')}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_STYLES[campaign.type] ?? 'bg-muted text-muted-foreground')}>
            {campaign.type.replace('_', ' ')}
          </span>
        </div>
      </div>
      <p className="font-semibold text-foreground mb-2">{campaign.name}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        {campaign._count && (
          <span className="flex items-center gap-1"><Users2 className="w-3 h-3" /> {campaign._count.contacts} contacts</span>
        )}
        {campaign.startDate && (
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateIST(campaign.startDate)}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{campaign.owner.firstName} {campaign.owner.lastName}</p>
    </button>
  );
}

function CampaignPanel({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-detail', campaignId],
    queryFn: () => apiFetch<{ data: CampaignDetail }>(`/campaigns/${campaignId}`),
  });

  const campaign = data?.data;

  return (
    <Sheet open onClose={onClose} title={campaign?.name ?? 'Loading...'}>
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {campaign && (
        <div className="px-6 py-4 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">{campaign.name}</h3>
              <div className="flex gap-1.5 mt-1">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[campaign.status] ?? 'bg-muted')}>{campaign.status.replace('_', ' ')}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_STYLES[campaign.type] ?? 'bg-muted')}>{campaign.type.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {campaign.startDate && (
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium text-foreground">{formatDateIST(campaign.startDate)}</p>
              </div>
            )}
            {campaign.endDate && (
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium text-foreground">{formatDateIST(campaign.endDate)}</p>
              </div>
            )}
          </div>

          {/* Audience */}
          {campaign._count && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Audience</h4>
              <div className="flex items-center gap-2 bg-muted/40 rounded-xl p-3">
                <Users2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{campaign._count.contacts} contacts</span>
              </div>
            </section>
          )}

          {/* Collaborators */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">People Working on This</h4>
            <div className="space-y-2">
              {[campaign.owner, ...(campaign.collaborators ?? [])].map((person, i) => (
                <div key={`${person.id}-${i}`} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                    {person.firstName[0]}{person.lastName[0]}
                  </div>
                  <span className="text-sm text-foreground">{person.firstName} {person.lastName}</span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto', ROLE_STYLES[person.role] ?? 'bg-muted')}>{person.role}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Performance metrics */}
          {campaign.stats && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Performance</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Sent', value: campaign.stats.sent },
                  { label: 'Delivered', value: campaign.stats.delivered },
                  { label: 'Opened', value: `${campaign.stats.opened} (${campaign.stats.openRate}%)` },
                  { label: 'Clicked', value: `${campaign.stats.clicked} (${campaign.stats.clickRate}%)` },
                  { label: 'Unsubscribed', value: campaign.stats.unsubscribed },
                  { label: 'Bounced', value: campaign.stats.bounced },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-base font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}

export function CampaignsPage() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CampaignTab>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', tab],
    queryFn: () => {
      const statusMap: Record<CampaignTab, string> = { active: 'active', past: 'completed', all: 'all' };
      return apiFetch<{ data: Campaign[] }>(`/campaigns?status=${statusMap[tab]}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: body.name,
          type: body.type || 'EMAIL_BLAST',
          subject: body.subject || undefined,
          startDate: body.startDate || undefined,
          endDate: body.endDate || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setCreateOpen(false);
    },
  });

  const campaigns = data?.data ?? [];
  const canCreate = user && ['ADMIN', 'BOSS', 'MANAGER', 'EMPLOYEE', 'INTERN'].includes(user.role);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Campaign
            </Button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex border border-border/60 rounded-xl overflow-hidden w-fit">
          {([['active', 'Active'], ['past', 'Past'], ['all', 'All']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn('px-4 py-2 text-sm font-medium transition-colors',
                tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length: 6}).map((_, i) => <div key={i} className="h-40 bg-card border border-border/40 rounded-2xl animate-pulse" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Megaphone className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-medium">No {tab} campaigns</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map(c => (
              <CampaignCard key={c.id} campaign={c} onClick={() => setSelectedId(c.id)} />
            ))}
          </div>
        )}
      </div>

      {selectedId && <CampaignPanel campaignId={selectedId} onClose={() => setSelectedId(null)} />}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New Campaign">
        <RecordForm
          fields={[
            { name: 'name', label: 'Campaign Name', required: true },
            {
              name: 'type', label: 'Type', type: 'select',
              options: [
                { value: 'EMAIL_BLAST', label: 'Email Blast' },
                { value: 'DRIP_SEQUENCE', label: 'Drip Sequence' },
              ],
            },
            { name: 'subject', label: 'Email Subject' },
            { name: 'startDate', label: 'Start Date', type: 'date' },
            { name: 'endDate', label: 'End Date', type: 'date' },
          ]}
          loading={createMutation.isPending}
          submitLabel="Create Campaign"
          onSubmit={values => createMutation.mutate(values as unknown as Record<string, string>)}
        />
      </Dialog>
    </div>
  );
}
