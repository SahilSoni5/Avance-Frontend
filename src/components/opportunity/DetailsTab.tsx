'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Opportunity } from '@/api/opportunities.types';
import { forecastCategoryForStage, stageBadgeClass } from './constants';
import { formatOpportunityCurrency, formatOpportunityDate, formatOpportunityDateTime } from './utils';
import { LightningCard } from './LightningCard';
import { cn } from '@/lib/utils';

function FieldRow({ label, children, alignRight }: { label: string; children: ReactNode; alignRight?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-[#f3f3f3] last:border-0 text-sm">
      <dt className="text-[#706e6b]">{label}</dt>
      <dd className={cn('text-[#181818]', alignRight && 'text-right tabular-nums')}>{children}</dd>
    </div>
  );
}

export function DetailsTab({ opportunity }: { opportunity: Opportunity }) {
  const currency = opportunity.currency ?? 'USD';
  const forecast = opportunity.forecastCategory ?? forecastCategoryForStage(opportunity.stage);

  return (
    <div className="space-y-4">
      <LightningCard>
        <div className="px-4 py-3 border-b border-[#e5e5e5]">
          <h3 className="text-sm font-bold text-[#181818]">Opportunity Information</h3>
        </div>
        <dl className="px-4 py-2">
          <FieldRow label="Opportunity Name">{opportunity.name}</FieldRow>
          <FieldRow label="Account">
            <Link
              href={`/brands/${opportunity.account.id}`}
              className="text-[#0176D3] hover:underline font-medium"
            >
              {opportunity.account.name}
            </Link>
          </FieldRow>
          <FieldRow label="Type">{opportunity.type || '—'}</FieldRow>
          <FieldRow label="Lead Source">{opportunity.leadSource || '—'}</FieldRow>
          <FieldRow label="Amount" alignRight>
            {formatOpportunityCurrency(opportunity.amount, currency)}
            {opportunity.amountLocked ? ' (from products)' : ''}
          </FieldRow>
          <FieldRow label="Close Date">{formatOpportunityDate(opportunity.closeDate)}</FieldRow>
          <FieldRow label="Next Step">{opportunity.nextStep || '—'}</FieldRow>
          <FieldRow label="Stage">
            <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', stageBadgeClass(opportunity.stage))}>
              {opportunity.stage}
            </span>
          </FieldRow>
          <FieldRow label="Forecast Category">
            <span className="inline-flex rounded-full border border-[#c9c9c9] bg-[#f3f3f3] px-2 py-0.5 text-xs font-semibold">
              {forecast}
            </span>
          </FieldRow>
          <FieldRow label="Probability" alignRight>{opportunity.probability}%</FieldRow>
          {opportunity.stage === 'Closed Lost' && (
            <FieldRow label="Loss Reason">{opportunity.lossReason || '—'}</FieldRow>
          )}
          <FieldRow label="Description">
            <span className="whitespace-pre-wrap">{opportunity.description || '—'}</span>
          </FieldRow>
        </dl>
      </LightningCard>

      <LightningCard>
        <div className="px-4 py-3 border-b border-[#e5e5e5]">
          <h3 className="text-sm font-bold text-[#181818]">System Information</h3>
        </div>
        <dl className="px-4 py-2">
          <FieldRow label="Opportunity Owner">
            {`${opportunity.owner.firstName} ${opportunity.owner.lastName}`}
          </FieldRow>
          <FieldRow label="Created">{formatOpportunityDateTime(opportunity.createdAt)}</FieldRow>
          <FieldRow label="Last Modified">{formatOpportunityDateTime(opportunity.updatedAt)}</FieldRow>
        </dl>
      </LightningCard>
    </div>
  );
}
