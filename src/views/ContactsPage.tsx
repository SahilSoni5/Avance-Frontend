'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, User2, Phone, Mail, Briefcase, Building2,
  X, ExternalLink, CheckCircle2, Loader2,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatCurrencyINR, formatDateIST, formatNumberIN } from '../lib/locale';
import { Button } from '../components/ui';
import { Sheet } from '../components/ui/Sheet';
import { ContactFormDialog, contactFormToApiBody, type ContactFormValues } from '../components/ContactFormDialog';
import { invalidateContactBrandSync } from '../lib/query-invalidation';
import { cn } from '../lib/utils';

// --- Types ---
interface ContactOwner { id: string; firstName: string; lastName: string; role: string }
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  status: string | null;
  avatar: string | null;
  leadSource: string | null;
  owner: ContactOwner;
  emails: { email: string; isPrimary: boolean }[];
  phones: { phone: string; isPrimary: boolean }[];
  account: { id: string; name: string; industry: string | null; website: string | null } | null;
}

interface Deal {
  id: string; name?: string; value?: number | string | null; stage?: string;
  closeDate: string | null; probability: number | null;
  owner: ContactOwner; visible: boolean;
}

interface TouchPoint {
  user: ContactOwner & { email?: string; phone?: string | null };
  lastContactAt: string;
  types: string[];
  isCurrent: boolean;
}

interface ContactDetail extends Contact {
  touchPoints: TouchPoint[];
  pipeline: { activeDeals: Deal[]; closedDeals: Deal[] };
  activities?: { id: string; type: string; description: string | null; subject?: string; createdAt: string; user?: ContactOwner }[];
  notes?: { id: string; content: string; createdAt: string; user: ContactOwner }[];
}

// --- Industry colours ---
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

const STATUS_STYLES: Record<string, string> = {
  Lead: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Prospect: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Customer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-rose-100 text-rose-700',
  BOSS: 'bg-amber-100 text-amber-700',
  MANAGER: 'bg-indigo-100 text-indigo-700',
  EMPLOYEE: 'bg-slate-100 text-slate-700',
  INTERN: 'bg-gray-100 text-gray-600',
};

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function useDebounce<T>(value: T, delay = 300): T {
  const [dv, setDv] = useState(value);
  useCallback(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay])();
  return dv;
}

// --- Contact Card ---
function ContactCard({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  const industry = contact.account?.industry ?? null;
  const email = contact.emails.find(e => e.isPrimary)?.email ?? contact.emails[0]?.email;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {contact.avatar
            ? <img src={contact.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
            : initials(contact.firstName, contact.lastName)
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{contact.firstName} {contact.lastName}</p>
          {contact.jobTitle && <p className="text-xs text-muted-foreground truncate">{contact.jobTitle}</p>}
        </div>
        {contact.status && (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', STATUS_STYLES[contact.status] ?? 'bg-muted text-muted-foreground')}>
            {contact.status}
          </span>
        )}
      </div>

      {contact.account && (
        <div className="flex items-center gap-1.5 mb-2">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{contact.account.name}</span>
        </div>
      )}

      {email && (
        <div className="flex items-center gap-1.5 mb-2">
          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{email}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        {industry ? (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INDUSTRY_COLORS[industry] ?? INDUSTRY_COLORS.Other)}>
            {industry}
          </span>
        ) : <span />}
        <span className="text-xs text-muted-foreground">
          {contact.owner.firstName} {contact.owner.lastName}
        </span>
      </div>
    </button>
  );
}

// --- Contact Slide-In Panel ---
function ContactPanel({ contactId, onClose }: {
  contactId: string; onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['contact-detail', contactId],
    queryFn: () => apiFetch<{ data: ContactDetail }>(`/contacts/${contactId}`),
    enabled: !!contactId,
  });

  const contact = data?.data;

  const email = contact?.emails.find(e => e.isPrimary)?.email ?? contact?.emails[0]?.email;
  const phone = contact?.phones.find(p => p.isPrimary)?.phone ?? contact?.phones[0]?.phone;
  const industry = contact?.account?.industry;
  const activeDeals = contact?.pipeline?.activeDeals ?? [];
  const pastDeals = contact?.pipeline?.closedDeals ?? [];
  const touchPoints = contact?.touchPoints ?? [];

  return (
    <Sheet open onClose={onClose} title={contact ? `${contact.firstName} ${contact.lastName}` : 'Loading...'}>
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {contact && (
        <div className="px-6 py-4 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {initials(contact.firstName, contact.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground">{contact.firstName} {contact.lastName}</h3>
              {contact.jobTitle && <p className="text-sm text-muted-foreground">{contact.jobTitle}</p>}
              {contact.account && (
                <div className="flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{contact.account.name}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap mt-2">
                {contact.status && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[contact.status] ?? 'bg-muted text-muted-foreground')}>
                    {contact.status}
                  </span>
                )}
                {industry && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INDUSTRY_COLORS[industry] ?? INDUSTRY_COLORS.Other)}>
                    {industry}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <Phone className="w-4 h-4" /> {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <Mail className="w-4 h-4" /> {email}
              </a>
            )}
            {contact.account?.website && (
              <a href={contact.account.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-4 h-4" /> {contact.account.website}
              </a>
            )}
          </div>

          {/* Who has contacted / is in touch */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Who Has Contacted This Person
            </h4>
            {touchPoints.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No interaction history yet.</p>
            ) : (
              <div className="space-y-2">
                {touchPoints.map(tp => (
                  <div key={tp.user.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {initials(tp.user.firstName, tp.user.lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{tp.user.firstName} {tp.user.lastName}</p>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ROLE_STYLES[tp.user.role] ?? 'bg-muted text-muted-foreground')}>
                          {tp.user.role}
                        </span>
                        {tp.isCurrent && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Current</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tp.types.join(', ')} · Last {formatDateIST(tp.lastContactAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Current owner (primary contact) */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assigned Owner</h4>
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials(contact.owner.firstName, contact.owner.lastName)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{contact.owner.firstName} {contact.owner.lastName}</p>
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ROLE_STYLES[contact.owner.role] ?? 'bg-muted text-muted-foreground')}>
                  {contact.owner.role}
                </span>
              </div>
            </div>
          </section>

          {/* Current Pipeline */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Pipeline</h4>
            {activeDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No active deals.</p>
            ) : (
              <div className="space-y-2">
                {activeDeals.map(deal => (
                  deal.visible ? (
                    <div key={deal.id} className="p-3 bg-muted/40 rounded-xl border border-border/40">
                      <p className="font-medium text-sm text-foreground">{deal.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {deal.stage && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full">{deal.stage}</span>
                        )}
                        {deal.value != null && <span className="font-semibold text-foreground">{formatCurrencyINR(deal.value)}</span>}
                        {deal.closeDate && <span>Closes {formatDateIST(deal.closeDate)}</span>}
                        <span>· {deal.owner.firstName} {deal.owner.lastName}</span>
                      </div>
                    </div>
                  ) : (
                    <div key={deal.id} className="p-3 bg-muted/30 rounded-xl text-sm text-muted-foreground italic">
                      Active deal being worked by{' '}
                      <span className="font-medium text-foreground">{deal.owner.firstName} {deal.owner.lastName}</span>
                    </div>
                  )
                ))}
              </div>
            )}
          </section>

          {/* Previous Pipelines */}
          {pastDeals.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Previous Deals</h4>
              <div className="space-y-2">
                {pastDeals.map(deal => (
                  deal.visible ? (
                    <div key={deal.id} className="p-3 bg-muted/30 rounded-xl border border-border/30">
                      <p className="text-sm font-medium text-foreground">{deal.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        {deal.stage && (
                          <span className={cn('px-2 py-0.5 rounded-full', /won/i.test(deal.stage) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                            {deal.stage}
                          </span>
                        )}
                        {deal.value != null && <span>{formatCurrencyINR(deal.value)}</span>}
                        <span>· {deal.owner.firstName} {deal.owner.lastName}</span>
                      </div>
                    </div>
                  ) : (
                    <div key={deal.id} className="p-3 bg-muted/30 rounded-xl text-sm text-muted-foreground italic">
                      Past deal handled by{' '}
                      <span className="font-medium text-foreground">{deal.owner.firstName} {deal.owner.lastName}</span>
                    </div>
                  )
                ))}
              </div>
            </section>
          )}

          {/* Activity Timeline */}
          {contact.activities && contact.activities.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Activity</h4>
              <div className="space-y-2">
                {contact.activities.slice(0, 5).map(act => (
                  <div key={act.id} className="flex gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                    <div>
                      <p className="text-foreground">{act.description ?? act.subject}</p>
                      <p className="text-xs text-muted-foreground">{formatDateIST(act.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          {contact.notes && contact.notes.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
              <div className="space-y-2">
                {contact.notes.slice(0, 3).map(note => (
                  <div key={note.id} className="p-3 bg-muted/30 rounded-xl text-sm">
                    <p className="text-foreground">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{note.user.firstName} · {formatDateIST(note.createdAt)}</p>
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

// --- Main Page ---
export function ContactsPage() {
  const queryClient = useQueryClient();
  const [nameSearch, setNameSearch] = useState('');
  const [designationSearch, setDesignationSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const dName = nameSearch;
  const dDesig = designationSearch;

  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', dName, dDesig, industryFilter],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '100' });
      if (dName) p.set('name', dName);
      if (dDesig) p.set('designation', dDesig);
      if (industryFilter) p.set('industry', industryFilter);
      return apiFetch<{ data: Contact[]; scope: string }>(`/contacts?${p}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      apiFetch('/contacts', {
        method: 'POST',
        body: JSON.stringify(contactFormToApiBody(values)),
      }),
    onSuccess: (_data, values) => {
      invalidateContactBrandSync(queryClient, { accountId: values.accountId || undefined });
      setCreateOpen(false);
    },
  });

  const contacts = data?.data ?? [];
  const scopeLabel = data?.scope ?? '';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
            {scopeLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Viewing: All Contacts
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Contact
          </Button>
        </div>

        {/* 3-filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={nameSearch}
              onChange={e => setNameSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {nameSearch && (
              <button type="button" onClick={() => setNameSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative flex-1">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={designationSearch}
              onChange={e => setDesignationSearch(e.target.value)}
              placeholder="Search by designation..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {designationSearch && (
              <button type="button" onClick={() => setDesignationSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative flex-1 sm:max-w-[220px]">
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
              <div key={i} className="bg-card border border-border/40 rounded-2xl p-5 animate-pulse h-44" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <X className="w-8 h-8 mb-3 text-red-400" />
            <p>Failed to load contacts. Please try again.</p>
          </div>
        )}

        {!isLoading && !error && contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <User2 className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No contacts found</p>
            <p className="text-sm mb-4">Try adjusting your filters or add a new contact</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Contact
            </Button>
          </div>
        )}

        {!isLoading && contacts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {contacts.map(c => (
              <ContactCard
                key={c.id}
                contact={c}
                onClick={() => setSelectedContactId(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slide-in panel */}
      {selectedContactId && (
        <ContactPanel
          contactId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
        />
      )}

      <ContactFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => createMutation.mutate(values)}
        loading={createMutation.isPending}
      />
    </div>
  );
}
