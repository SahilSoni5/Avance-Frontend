export type OpportunityStage =
  | 'Prospecting'
  | 'Qualification'
  | 'Needs Analysis'
  | 'Value Proposition'
  | 'Id. Decision Makers'
  | 'Proposal/Price Quote'
  | 'Negotiation/Review'
  | 'Closed Won'
  | 'Closed Lost';

export type ForecastCategory = 'Pipeline' | 'Best Case' | 'Closed' | 'Omitted';

export type LossReason = 'Price' | 'Competitor' | 'No Budget' | 'No Decision' | 'Other';

export interface OpportunityUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

export interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  account: { id: string; name: string };
  type?: string | null;
  leadSource?: string | null;
  amount: number;
  currency?: string;
  closeDate: string | null;
  nextStep?: string | null;
  stage: OpportunityStage | string;
  probability: number;
  description?: string | null;
  lossReason?: LossReason | string | null;
  isClosed?: boolean;
  isWon?: boolean;
  forecastCategory?: ForecastCategory | string;
  amountLocked?: boolean;
  lineItemCount?: number;
  owner: OpportunityUser;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityPatch = Partial<{
  name: string;
  accountId: string | null;
  type: string | null;
  leadSource: string | null;
  amount: number | null;
  closeDate: string | null;
  nextStep: string | null;
  stage: string;
  probability: number;
  description: string | null;
  lossReason: LossReason | string | null;
}>;

export interface CreateOpportunityInput {
  name: string;
  accountId?: string | null;
  stage?: string;
  amount?: number | null;
  probability?: number;
  closeDate: string;
  type?: string | null;
  leadSource?: string | null;
  nextStep?: string | null;
  description?: string | null;
  lossReason?: LossReason | string | null;
}

export interface StageHistoryEntry {
  id: string;
  opportunityId: string;
  oldStage: string | null;
  newStage: string;
  changedAt: string;
  changedBy: OpportunityUser;
}

export interface ContactRole {
  id: string;
  contactId: string;
  contact: { id: string; firstName: string; lastName: string; email?: string };
  role: string;
  isPrimary: boolean;
}

export interface ContactRoleInput {
  contactId: string;
  role?: string;
  isPrimary?: boolean;
}

export interface LineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface LineItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
}

export type ActivityType = 'call' | 'task' | 'event' | 'email';

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string | null;
  dueDate?: string | null;
  status?: 'open' | 'completed' | string | null;
  completedAt?: string | null;
  createdAt: string;
  owner?: OpportunityUser;
}

export interface ActivityInput {
  type: ActivityType;
  subject?: string;
  notes?: string;
  dueDate?: string;
  status?: 'open' | 'completed' | string;
}
