import type { OpportunityStage } from '@/api/opportunities.types';

export const SF_PRIMARY = '#0176D3';
export const SF_COMPLETED = '#4BCA81';
export const SF_FUTURE = '#DDDBDA';
export const SF_PAGE_BG = '#F3F3F3';

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Id. Decision Makers',
  'Proposal/Price Quote',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
];

export const STAGE_PROBABILITY: Record<string, number> = {
  Prospecting: 10,
  Qualification: 20,
  'Needs Analysis': 30,
  'Value Proposition': 40,
  'Id. Decision Makers': 50,
  'Proposal/Price Quote': 65,
  'Negotiation/Review': 80,
  'Closed Won': 100,
  'Closed Lost': 0,
};

export const OPPORTUNITY_TYPES = ['New Business', 'Existing Business'] as const;

export const OPPORTUNITY_LEAD_SOURCES = [
  'Web',
  'Phone Inquiry',
  'Partner Referral',
  'Purchased List',
  'Other',
] as const;

export const LOSS_REASONS = [
  'Price',
  'Competitor',
  'No Budget',
  'No Decision',
  'Other',
] as const;

export const FORECAST_CATEGORY_BY_STAGE: Record<string, string> = {
  Prospecting: 'Pipeline',
  Qualification: 'Pipeline',
  'Needs Analysis': 'Pipeline',
  'Value Proposition': 'Best Case',
  'Id. Decision Makers': 'Best Case',
  'Proposal/Price Quote': 'Best Case',
  'Negotiation/Review': 'Best Case',
  'Closed Won': 'Closed',
  'Closed Lost': 'Omitted',
};

export function forecastCategoryForStage(stage: string) {
  return FORECAST_CATEGORY_BY_STAGE[stage] ?? 'Pipeline';
}

export function stageIndex(stage: string) {
  return OPPORTUNITY_STAGES.indexOf(stage as OpportunityStage);
}

export function isClosedStage(stage: string) {
  return stage === 'Closed Won' || stage === 'Closed Lost';
}

export function stageBadgeClass(stage: string) {
  if (stage === 'Closed Won') return 'bg-[#4BCA81]/15 text-[#2e844a] border-[#4BCA81]/40';
  if (stage === 'Closed Lost') return 'bg-red-100 text-red-700 border-red-200';
  if (isClosedStage(stage)) return 'bg-slate-100 text-slate-600';
  return 'bg-[#0176D3]/10 text-[#0176D3] border-[#0176D3]/30';
}
