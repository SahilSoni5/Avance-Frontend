import type {
  Activity,
  ContactRole,
  LineItem,
  Opportunity,
  OpportunityUser,
  StageHistoryEntry,
} from './opportunities.types';

type RawUser = { id: string; firstName: string; lastName: string };

type RawOpportunity = {
  id: string;
  name: string;
  accountId?: string | null;
  account?: { id: string; name: string } | null;
  type?: string | null;
  leadSource?: string | null;
  amount?: string | number | null;
  closeDate: string;
  nextStep?: string | null;
  stage: string;
  probability: number;
  description?: string | null;
  lossReason?: string | null;
  isClosed?: boolean;
  isWon?: boolean;
  forecastCategory?: string;
  amountLocked?: boolean;
  lineItemCount?: number;
  owner: RawUser;
  createdAt: string;
  updatedAt: string;
};

type RawContactRole = {
  id: string;
  contactId: string;
  contact: { id: string; firstName: string; lastName: string };
  role?: string | null;
  isPrimary: boolean;
};

type RawLineItem = {
  id: string;
  productId: string;
  product?: { id: string; name: string; sku?: string } | null;
  quantity: number;
  unitPrice: string | number;
  discountPct: string | number;
  totalPrice?: number;
};

type RawActivity = {
  id: string;
  type: Activity['type'];
  subject?: string | null;
  notes?: string | null;
  dueDate?: string | null;
  status: string;
  completedAt?: string | null;
  createdAt: string;
  createdBy: RawUser;
};

type RawStageHistory = {
  id: string;
  opportunityId: string;
  oldStage?: string | null;
  newStage: string;
  changedAt: string;
  changedBy: RawUser;
};

function mapUser(user: RawUser): OpportunityUser {
  return { id: user.id, firstName: user.firstName, lastName: user.lastName };
}

export function mapOpportunity(raw: RawOpportunity): Opportunity {
  return {
    id: raw.id,
    name: raw.name,
    accountId: raw.accountId ?? '',
    account: raw.account ?? { id: '', name: '—' },
    type: raw.type,
    leadSource: raw.leadSource,
    amount: raw.amount != null ? Number(raw.amount) : 0,
    closeDate: raw.closeDate,
    nextStep: raw.nextStep,
    stage: raw.stage,
    probability: raw.probability,
    description: raw.description,
    lossReason: raw.lossReason,
    isClosed: raw.isClosed,
    isWon: raw.isWon,
    forecastCategory: raw.forecastCategory,
    amountLocked: raw.amountLocked,
    lineItemCount: raw.lineItemCount,
    owner: mapUser(raw.owner),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function mapContactRole(raw: RawContactRole): ContactRole {
  return {
    id: raw.id,
    contactId: raw.contactId,
    contact: raw.contact,
    role: raw.role ?? '',
    isPrimary: raw.isPrimary,
  };
}

export function mapLineItem(raw: RawLineItem): LineItem {
  const unitPrice = Number(raw.unitPrice);
  const discount = Number(raw.discountPct);
  const total =
    raw.totalPrice ??
    raw.quantity * unitPrice * (1 - discount / 100);
  return {
    id: raw.id,
    productId: raw.productId,
    productName: raw.product?.name ?? 'Product',
    quantity: raw.quantity,
    unitPrice,
    discount,
    total,
  };
}

export function mapActivity(raw: RawActivity): Activity {
  const completed = raw.status === 'completed';
  return {
    id: raw.id,
    type: raw.type,
    subject: raw.subject ?? '',
    description: raw.notes,
    dueDate: raw.dueDate,
    status: raw.status,
    completedAt: completed ? (raw.completedAt ?? raw.createdAt) : null,
    createdAt: raw.createdAt,
    owner: mapUser(raw.createdBy),
  };
}

export function mapStageHistory(raw: RawStageHistory): StageHistoryEntry {
  return {
    id: raw.id,
    opportunityId: raw.opportunityId,
    oldStage: raw.oldStage ?? null,
    newStage: raw.newStage,
    changedAt: raw.changedAt,
    changedBy: mapUser(raw.changedBy),
  };
}
