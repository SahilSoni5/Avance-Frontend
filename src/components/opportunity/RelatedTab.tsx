'use client';

import type { ContactRole, LineItem, LineItemInput } from '@/api/opportunities.types';
import { ContactRolesList } from './ContactRolesList';
import { ProductsList } from './ProductsList';
import { FilesList, NotesList, QuotesList } from './RelatedLists';
import { LightningCard } from './LightningCard';

interface RelatedTabProps {
  contactRoles: ContactRole[];
  lineItems: LineItem[];
  currency?: string;
  loadingRoles?: boolean;
  loadingItems?: boolean;
  readOnly?: boolean;
  onAddRole: (input: { contactId: string; role: string; isPrimary: boolean }) => void;
  onRemoveRole: (id: string) => void;
  onAddItem: (input: LineItemInput) => void;
  onUpdateItem: (id: string, input: Partial<LineItemInput>) => void;
  onRemoveItem: (id: string) => void;
  savingRole?: boolean;
  savingItem?: boolean;
  roleError?: string | null;
}

export function RelatedTab(props: RelatedTabProps) {
  return (
    <LightningCard className="overflow-hidden">
      <ContactRolesList
        roles={props.contactRoles}
        loading={props.loadingRoles}
        onAdd={props.onAddRole}
        onRemove={props.onRemoveRole}
        adding={props.savingRole}
        addError={props.roleError}
        readOnly={props.readOnly}
      />
      <ProductsList
        items={props.lineItems}
        loading={props.loadingItems}
        currency={props.currency}
        onAdd={props.onAddItem}
        onUpdate={props.onUpdateItem}
        onRemove={props.onRemoveItem}
        saving={props.savingItem}
        readOnly={props.readOnly}
      />
      <QuotesList />
      <FilesList />
      <NotesList />
    </LightningCard>
  );
}
