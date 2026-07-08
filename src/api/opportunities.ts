import { apiFetch } from '../lib/api';
import {
  mapActivity,
  mapContactRole,
  mapLineItem,
  mapOpportunity,
  mapStageHistory,
} from './opportunities.mapper';
import type {
  ActivityInput,
  ContactRoleInput,
  CreateOpportunityInput,
  LineItemInput,
  OpportunityPatch,
} from './opportunities.types';

const base = (id: string) => `/opportunities/${id}`;

export async function listOpportunities(limit = 100) {
  const res = await apiFetch<{ data: unknown[] }>(`/opportunities?limit=${limit}`);
  return res.data.map((row) => mapOpportunity(row as Parameters<typeof mapOpportunity>[0]));
}

export async function createOpportunity(input: CreateOpportunityInput) {
  const res = await apiFetch<{ data: unknown }>('/opportunities', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return mapOpportunity(res.data as Parameters<typeof mapOpportunity>[0]);
}

export async function getOpportunity(id: string) {
  const res = await apiFetch<{ data: unknown }>(base(id));
  return mapOpportunity(res.data as Parameters<typeof mapOpportunity>[0]);
}

export async function updateOpportunity(id: string, patch: OpportunityPatch) {
  const res = await apiFetch<{ data: unknown }>(base(id), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return mapOpportunity(res.data as Parameters<typeof mapOpportunity>[0]);
}

export async function reopenOpportunity(id: string, stage = 'Prospecting') {
  const res = await apiFetch<{ data: unknown }>(`${base(id)}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ stage }),
  });
  return mapOpportunity(res.data as Parameters<typeof mapOpportunity>[0]);
}

export async function deleteOpportunity(id: string) {
  await apiFetch(base(id), { method: 'DELETE' });
}

export async function cloneOpportunity(id: string) {
  const res = await apiFetch<{ data: unknown }>(`${base(id)}/clone`, { method: 'POST' });
  return mapOpportunity(res.data as Parameters<typeof mapOpportunity>[0]);
}

export async function listStageHistory(opportunityId: string) {
  const res = await apiFetch<{ data: unknown[] }>(`${base(opportunityId)}/stage-history`);
  return res.data.map((row) => mapStageHistory(row as Parameters<typeof mapStageHistory>[0]));
}

export async function listContactRoles(opportunityId: string) {
  const res = await apiFetch<{ data: unknown[] }>(`${base(opportunityId)}/contact-roles`);
  return res.data.map((row) => mapContactRole(row as Parameters<typeof mapContactRole>[0]));
}

export async function addContactRole(opportunityId: string, input: ContactRoleInput) {
  const res = await apiFetch<{ data: unknown }>(`${base(opportunityId)}/contact-roles`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return mapContactRole(res.data as Parameters<typeof mapContactRole>[0]);
}

export async function removeContactRole(opportunityId: string, roleId: string) {
  await apiFetch(`${base(opportunityId)}/contact-roles/${roleId}`, { method: 'DELETE' });
}

export async function listLineItems(opportunityId: string) {
  const res = await apiFetch<{ data: unknown[] }>(`${base(opportunityId)}/line-items`);
  return res.data.map((row) => mapLineItem(row as Parameters<typeof mapLineItem>[0]));
}

export async function addLineItem(opportunityId: string, input: LineItemInput) {
  const res = await apiFetch<{ data: unknown }>(`${base(opportunityId)}/line-items`, {
    method: 'POST',
    body: JSON.stringify({
      productId: input.productId,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      discountPct: input.discountPct ?? 0,
    }),
  });
  return mapLineItem(res.data as Parameters<typeof mapLineItem>[0]);
}

export async function updateLineItem(opportunityId: string, itemId: string, input: Partial<LineItemInput>) {
  const body: Record<string, number> = {};
  if (input.quantity != null) body.quantity = input.quantity;
  if (input.unitPrice != null) body.unitPrice = input.unitPrice;
  if (input.discountPct != null) body.discountPct = input.discountPct;
  const res = await apiFetch<{ data: unknown }>(`${base(opportunityId)}/line-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapLineItem(res.data as Parameters<typeof mapLineItem>[0]);
}

export async function removeLineItem(opportunityId: string, itemId: string) {
  await apiFetch(`${base(opportunityId)}/line-items/${itemId}`, { method: 'DELETE' });
}

export async function listActivities(opportunityId: string) {
  const res = await apiFetch<{ data: unknown[] }>(`${base(opportunityId)}/activities`);
  return res.data.map((row) => mapActivity(row as Parameters<typeof mapActivity>[0]));
}

export async function createActivity(opportunityId: string, input: ActivityInput) {
  const res = await apiFetch<{ data: unknown }>(`${base(opportunityId)}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      type: input.type,
      subject: input.subject,
      dueDate: input.dueDate,
      status: input.status,
      notes: input.notes,
    }),
  });
  return mapActivity(res.data as Parameters<typeof mapActivity>[0]);
}

export async function updateActivity(opportunityId: string, activityId: string, input: Partial<ActivityInput>) {
  const res = await apiFetch<{ data: unknown }>(`${base(opportunityId)}/activities/${activityId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      type: input.type,
      subject: input.subject,
      dueDate: input.dueDate,
      status: input.status,
      notes: input.notes,
    }),
  });
  return mapActivity(res.data as Parameters<typeof mapActivity>[0]);
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  price: string | number;
}

export async function listProducts() {
  const res = await apiFetch<{ data: ProductOption[] }>('/products');
  return res.data;
}
