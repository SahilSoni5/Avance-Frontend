'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Building2, Users2, Briefcase, Globe, Phone, Mail,
  X, ExternalLink, Loader2, UserPlus,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatCurrencyINR, formatDateIST } from '../lib/locale';
import { useAuthStore } from '../stores/auth.store';
import { Button } from '../components/ui';
import { Sheet } from '../components/ui/Sheet';
import { BrandFormDialog, type PocFormRow } from '../components/BrandFormDialog';
import { invalidateContactBrandSync } from '../lib/query-invalidation';
import { cn } from '../lib/utils';

// --- Types ---
interface AccountOwner { id: string; firstName: string; lastName: string; role: string }
interface Account {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  status: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  owner: AccountOwner;
  _count?: { contacts: number; deals: number };
}

interface Poc {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  emails: { email: string }[];
  phones: { phone: string }[];
  owner: AccountOwner;
}

interface PipelineDeal {
  id: string; name: string; value: number | null; stage: string;
  closeDate: string | null; probability: number | null;
  visible: boolean;
  owner: AccountOwner;
}

interface AccountPipelineData {
  activeDeals: PipelineDeal[];
  closedDeals: PipelineDeal[];
}

// --- Helpers ---
const INDUSTRY_COLORS: Record<string, string> = {
  FMCG: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Banking: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Insurance: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  Retail: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Technology: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  Healthcare: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Education: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'Real Estate': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  Manufacturing: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  Media: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  Hospitality: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  Logistics: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const INDUSTRIES = ['FMCG','Banking','Insurance','Retail','Technology','Healthcare','Education','Real Estate','Manufacturing','Media','Hospitality','Logistics','Other'];

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-rose-100 text-rose-700',
  BOSS: 'bg-amber-100 text-amber-700',
  MANAGER: 'bg-indigo-100 text-indigo-700',
  EMPLOYEE: 'bg-slate-100 text-slate-700',
  INTERN: 'bg-gray-100 text-gray-600',
};

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-slate-100 text-slate-600',
  'In Pipeline': 'bg-blue-100 text-blue-700',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// --- Brand Card ---
function BrandCard({ account, onClick }: { account: Account; onClick: () => void }) {
  const ind = account.industry;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {initials(account.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{account.name}</p>
          {account.website && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Globe className="w-3 h-3 shrink-0" />
              {account.website.replace(/^https?:\/\//, '')}
            </p>
          )}
        </div>
        {account.status && (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', STATUS_STYLES[account.status] ?? 'bg-muted text-muted-foreground')}>
            {account.status}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Users2 className="w-3.5 h-3.5" />
          {account._count?.contacts ?? 0} POCs
        </span>
        <span className="flex items-center gap-1">
          <Briefcase className="w-3.5 h-3.5" />
          {account._count?.deals ?? 0} deals
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        {ind ? (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INDUSTRY_COLORS[ind] ?? INDUSTRY_COLORS.Other)}>
            {ind}
          </span>
        ) : <span />}
        <span className="text-xs text-muted-foreground">{account.owner.firstName} {account.owner.lastName}</span>
      </div>
    </button>
  );
}

// --- Brand Slide-In Panel ---
function BrandPanel({
  accountId,
  onClose,
  onAddPoc,
}: {
  accountId: string;
  onClose: () => void;
  onAddPoc: (brandId: string) => void;
}) {
  const user = useAuthStore(s => s.user);

  const { data: accountData, isLoading: acctLoading } = useQuery({
    queryKey: ['brand-detail', accountId],
    queryFn: () => apiFetch<{ data: Account }>(`/brands/${accountId}`),
    enabled: !!accountId,
  });

  const { data: pocsData } = useQuery({
    queryKey: ['brand-pocs', accountId],
    queryFn: () => apiFetch<{ data: Poc[] }>(`/brands/${accountId}/pocs`),
    enabled: !!accountId,
  });

  const { data: pipelineData } = useQuery({
    queryKey: ['brand-pipeline', accountId],
    queryFn: () => apiFetch<{ data: AccountPipelineData }>(`/brands/${accountId}/pipeline`),
    enabled: !!accountId,
  });

  const account = accountData?.data;
  const pocs = pocsData?.data ?? [];
  const pipeline = pipelineData?.data;
  const canAddPoc = user && ['ADMIN', 'BOSS', 'MANAGER', 'EMPLOYEE'].includes(user.role);

  const activeDeals = pipeline?.activeDeals ?? [];
  const closedDeals = pipeline?.closedDeals ?? [];
  const visibleActiveDeals = activeDeals.filter(d => d.visible);
  const hiddenDeals = activeDeals.filter(d => !d.visible);

  return (
    <Sheet open onClose={onClose} title={account?.name ?? 'Loading...'}>
      {acctLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {account && (
        <div className="px-6 py-4 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {initials(account.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground">{account.name}</h3>
              {account.industry && (
                <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1', INDUSTRY_COLORS[account.industry] ?? INDUSTRY_COLORS.Other)}>
                  {account.industry}
                </span>
              )}
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                {account.website && (
                  <a href={account.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground">
                    <Globe className="w-3 h-3" />
                    {account.website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {account.phone && (
                  <a href={`tel:${account.phone}`} className="flex items-center gap-1 hover:text-foreground">
                    <Phone className="w-3 h-3" /> {account.phone}
                  </a>
                )}
                {account.email && (
                  <a href={`mailto:${account.email}`} className="flex items-center gap-1 hover:text-foreground">
                    <Mail className="w-3 h-3" /> {account.email}
                  </a>
                )}
              </div>
              {account.address && <p className="text-xs text-muted-foreground mt-1">{account.address}</p>}
            </div>
          </div>

          {/* POCs */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Points of Contact ({pocs.length})
              </h4>
              {canAddPoc && (
                <button
                  type="button"
                  onClick={() => onAddPoc(accountId)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                >
                  <Plus className="w-3.5 h-3.5" /> Add POC
                </button>
              )}
            </div>
            {pocs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No contacts at this brand.</p>
            ) : (
              <div className="space-y-2">
                {pocs.map(poc => (
                  <div key={poc.id} className="p-3 bg-muted/40 rounded-xl border border-border/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{poc.firstName} {poc.lastName}</p>
                        {poc.jobTitle && <p className="text-xs text-muted-foreground">{poc.jobTitle}</p>}
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {poc.emails[0]?.email && (
                            <a href={`mailto:${poc.emails[0].email}`} className="flex items-center gap-1 hover:text-foreground">
                              <Mail className="w-3 h-3" /> {poc.emails[0].email}
                            </a>
                          )}
                          {poc.phones[0]?.phone && (
                            <a href={`tel:${poc.phones[0].phone}`} className="flex items-center gap-1 hover:text-foreground">
                              <Phone className="w-3 h-3" /> {poc.phones[0].phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">
                        {(poc.owner.firstName[0] ?? '') + (poc.owner.lastName[0] ?? '')}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Being contacted by{' '}
                        <span className="font-medium text-foreground">{poc.owner.firstName} {poc.owner.lastName}</span>
                      </span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', ROLE_STYLES[poc.owner.role] ?? 'bg-muted text-muted-foreground')}>
                        {poc.owner.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Pipeline */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Pipeline</h4>
            {activeDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No active deals.</p>
            ) : (
              <div className="space-y-2">
                {visibleActiveDeals.map(deal => (
                  <div key={deal.id} className="p-3 bg-muted/40 rounded-xl border border-border/40">
                    <p className="text-sm font-medium text-foreground">{deal.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full">{deal.stage}</span>
                      {deal.value != null && <span className="font-semibold text-foreground">{formatCurrencyINR(deal.value)}</span>}
                      {deal.closeDate && <span>Closes {formatDateIST(deal.closeDate)}</span>}
                      {deal.probability != null && <span>{deal.probability}% probability</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Owner: {deal.owner.firstName} {deal.owner.lastName}</p>
                  </div>
                ))}
                {hiddenDeals.length > 0 && (
                  <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-xl">
                    This brand is being actively worked on by{' '}
                    <span className="font-medium text-foreground">{hiddenDeals[0].owner.firstName} {hiddenDeals[0].owner.lastName}</span>
                    {hiddenDeals.length > 1 && ` and ${hiddenDeals.length - 1} others`}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Previous Deals */}
          {closedDeals.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Previous Deals</h4>
              <div className="space-y-2">
                {closedDeals.filter(d => d.visible).map(deal => (
                  <div key={deal.id} className="p-3 bg-muted/30 rounded-xl border border-border/30">
                    <p className="text-sm font-medium text-foreground">{deal.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className={cn('px-2 py-0.5 rounded-full', deal.stage === 'WON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{deal.stage}</span>
                      {deal.value != null && <span>{formatCurrencyINR(deal.value)}</span>}
                    </div>
                  </div>
                ))}
                {closedDeals.some(d => !d.visible) && (
                  <p className="text-xs text-muted-foreground italic">Some past deals are hidden based on your scope.</p>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}

// --- Main Page ---
export function AccountsPage() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'new' | 'existing'>('new');
  const [formBrandId, setFormBrandId] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['brands', search, industryFilter],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '100' });
      if (search) p.set('search', search);
      if (industryFilter) p.set('industry', industryFilter);
      return apiFetch<{ data: Account[]; scope: string }>(`/brands?${p}`);
    },
  });

  function toPocPayload(pocs: PocFormRow[]) {
    return pocs.map((p) => ({
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      ...(p.jobTitle.trim() ? { jobTitle: p.jobTitle.trim() } : {}),
      ...(p.email.trim() ? { email: p.email.trim() } : {}),
      ...(p.phone.trim() ? { phone: p.phone.trim() } : {}),
    }));
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      mode: 'new' | 'existing';
      brand?: { name: string; industry: string; website: string; phone: string; email: string };
      accountId?: string;
      pocs: PocFormRow[];
    }) => {
      const pocs = toPocPayload(payload.pocs);
      if (payload.mode === 'new') {
        const body: Record<string, unknown> = {
          name: payload.brand!.name,
          ...(payload.brand!.industry ? { industry: payload.brand!.industry } : {}),
          ...(payload.brand!.website ? { website: payload.brand!.website } : {}),
          ...(payload.brand!.phone ? { phone: payload.brand!.phone } : {}),
          ...(payload.brand!.email ? { email: payload.brand!.email } : {}),
          ...(pocs.length > 0 ? { pocs } : {}),
        };
        return apiFetch('/brands', { method: 'POST', body: JSON.stringify(body) });
      }
      return apiFetch(`/brands/${payload.accountId}/pocs`, {
        method: 'POST',
        body: JSON.stringify({ pocs }),
      });
    },
    onSuccess: (response, variables) => {
      const newBrandId = (response as { data?: { id?: string } })?.data?.id;
      const accountId = variables.mode === 'existing' ? variables.accountId : newBrandId;
      invalidateContactBrandSync(queryClient, { accountId });
      setFormOpen(false);
    },
  });

  function openNewBrand() {
    setFormMode('new');
    setFormBrandId('');
    setFormOpen(true);
  }

  function openAddPoc(brandId: string) {
    setFormMode('existing');
    setFormBrandId(brandId);
    setFormOpen(true);
  }

  const brands = data?.data ?? [];
  const scopeLabel = data?.scope ?? '';
  const canCreate = user && ['ADMIN', 'BOSS', 'MANAGER', 'EMPLOYEE'].includes(user.role);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Brands</h1>
            {scopeLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Viewing: {scopeLabel === 'self' ? 'My Records' : scopeLabel === 'team' ? 'My Team' : 'Org-Wide'}
              </p>
            )}
          </div>
          {canCreate && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openAddPoc('')}>
                <UserPlus className="w-4 h-4 mr-1.5" /> Add POC
              </Button>
              <Button size="sm" onClick={openNewBrand}>
                <Plus className="w-4 h-4 mr-1.5" /> New Brand
              </Button>
            </div>
          )}
        </div>

        {/* Search + industry filter */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search brands..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative sm:max-w-[220px]">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={industryFilter}
              onChange={e => setIndustryFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Industries</option>
              {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/40 rounded-2xl p-5 animate-pulse h-40" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <X className="w-8 h-8 mb-3 text-red-400" />
            <p>Failed to load brands. Please try again.</p>
          </div>
        )}

        {!isLoading && !error && brands.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Building2 className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No brands found</p>
            <p className="text-sm mb-4">Try adjusting your filters or add a new brand</p>
            {canCreate && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openAddPoc('')}>
                  <UserPlus className="w-4 h-4 mr-1.5" /> Add POC
                </Button>
                <Button size="sm" onClick={openNewBrand}>
                  <Plus className="w-4 h-4 mr-1.5" /> New Brand
                </Button>
              </div>
            )}
          </div>
        )}

        {!isLoading && brands.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {brands.map(b => (
              <BrandCard key={b.id} account={b} onClick={() => setSelectedId(b.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Slide-in panel */}
      {selectedId && (
        <BrandPanel
          accountId={selectedId}
          onClose={() => setSelectedId(null)}
          onAddPoc={openAddPoc}
        />
      )}

      <BrandFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => saveMutation.mutate(payload)}
        loading={saveMutation.isPending}
        initialMode={formMode}
        initialBrandId={formBrandId}
        industries={INDUSTRIES}
      />
    </div>
  );
}
