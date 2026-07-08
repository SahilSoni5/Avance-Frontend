'use client';

import Link from 'next/link';
import type { ContactRole, Opportunity } from '@/api/opportunities.types';
import { forecastCategoryForStage, stageBadgeClass } from './constants';
import { formatOpportunityCurrency, formatOpportunityDate } from './utils';
import { LightningCard } from './LightningCard';
import { cn } from '@/lib/utils';
import { Loader2, Paperclip } from 'lucide-react';

export function ContactRolesMini({
  roles,
  loading,
}: {
  roles: ContactRole[];
  loading?: boolean;
}) {
  return (
    <LightningCard>
      <div className="px-4 py-3 border-b border-[#e5e5e5]">
        <h3 className="text-sm font-bold text-[#181818]">Contact Roles</h3>
      </div>
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-[#706e6b]" />
          </div>
        ) : roles.length === 0 ? (
          <p className="text-xs text-[#706e6b]">No contact roles.</p>
        ) : (
          <ul className="space-y-2">
            {roles.slice(0, 5).map((r) => (
              <li key={r.id} className="text-sm">
                <p className="font-medium">
                  <Link
                    href={`/contacts/${r.contactId}`}
                    className="text-[#0176D3] hover:underline"
                  >
                    {r.contact.firstName} {r.contact.lastName}
                  </Link>
                  {r.isPrimary && (
                    <span className="ml-1 text-[10px] text-[#706e6b]">(Primary)</span>
                  )}
                </p>
                <p className="text-xs text-[#706e6b]">{r.role}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </LightningCard>
  );
}

export function KeyFieldsCard({ opportunity }: { opportunity: Opportunity }) {
  const currency = opportunity.currency ?? 'USD';
  const forecast = opportunity.forecastCategory ?? forecastCategoryForStage(opportunity.stage);
  return (
    <LightningCard className="mt-3">
      <div className="px-4 py-3 border-b border-[#e5e5e5]">
        <h3 className="text-sm font-bold text-[#181818]">Key Fields</h3>
      </div>
      <dl className="px-4 py-2 text-sm space-y-2">
        <div className="flex justify-between gap-2">
          <dt className="text-[#706e6b]">Amount</dt>
          <dd className="font-semibold tabular-nums text-right">
            {formatOpportunityCurrency(opportunity.amount, currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[#706e6b]">Close Date</dt>
          <dd>{formatOpportunityDate(opportunity.closeDate)}</dd>
        </div>
        <div className="flex justify-between gap-2 items-center">
          <dt className="text-[#706e6b]">Stage</dt>
          <dd>
            <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', stageBadgeClass(opportunity.stage))}>
              {opportunity.stage}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-2 items-center">
          <dt className="text-[#706e6b]">Forecast</dt>
          <dd>
            <span className="inline-flex rounded-full border border-[#c9c9c9] bg-[#f3f3f3] px-2 py-0.5 text-xs font-semibold">
              {forecast}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[#706e6b]">Probability</dt>
          <dd className="tabular-nums">{opportunity.probability}%</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[#706e6b]">Owner</dt>
          <dd className="text-right truncate">
            {opportunity.owner.firstName} {opportunity.owner.lastName}
          </dd>
        </div>
      </dl>
    </LightningCard>
  );
}

export function FilesWidget({ loading }: { loading?: boolean }) {
  return (
    <LightningCard className="mt-3">
      <div className="px-4 py-3 border-b border-[#e5e5e5]">
        <h3 className="text-sm font-bold text-[#181818]">Files</h3>
      </div>
      <div className="px-4 py-6 flex flex-col items-center text-[#706e6b]">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Paperclip className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-xs">No files</p>
          </>
        )}
      </div>
    </LightningCard>
  );
}

export function RelatedQuickLinksCard({
  counts,
}: {
  counts: {
    campaignInfluence: number;
    contactRoles: number;
    quotes: number;
    products: number;
    notes: number;
    files: number;
  };
}) {
  const links = [
    ['Campaign Influence', counts.campaignInfluence],
    ['Contact Roles', counts.contactRoles],
    ['Quotes', counts.quotes],
    ['Products', counts.products],
    ['Notes', counts.notes],
    ['Files', counts.files],
  ] as const;

  return (
    <LightningCard>
      <div className="px-4 py-3 border-b border-[#e5e5e5]">
        <h3 className="text-sm font-bold text-[#181818]">Related List Quick Links</h3>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-3">
        {links.map(([label, count]) => (
          <p key={label} className="text-xs text-[#0176D3]">
            {label} ({count})
          </p>
        ))}
      </div>
    </LightningCard>
  );
}
