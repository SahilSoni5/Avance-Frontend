'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Copy,
  DollarSign,
  Edit3,
  LogOut,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
  User,
} from 'lucide-react';
import type { Opportunity } from '@/api/opportunities.types';
import { forecastCategoryForStage, stageBadgeClass } from './constants';
import { formatOpportunityCurrency, formatOpportunityDate } from './utils';
import { LightningCard } from './LightningCard';
import { cn } from '@/lib/utils';

interface HighlightsPanelProps {
  opportunity: Opportunity;
  onNameSave: (name: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClone: () => void;
  onReopen?: () => void;
  onLogCall: () => void;
  onNewTask: () => void;
  onNewEvent: () => void;
  savingName?: boolean;
  readOnly?: boolean;
}

function OwnerAvatar({ owner }: { owner: Opportunity['owner'] }) {
  const initials = `${owner.firstName[0] ?? ''}${owner.lastName[0] ?? ''}`;
  return (
    <div className="flex items-center gap-2 min-w-0">
      {owner.avatar ? (
        <img src={owner.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#0176D3] text-white text-xs font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
      )}
      <span className="text-sm text-[#181818] truncate">
        {owner.firstName} {owner.lastName}
      </span>
    </div>
  );
}

export function HighlightsPanel({
  opportunity,
  onNameSave,
  onEdit,
  onDelete,
  onClone,
  onReopen,
  onLogCall,
  onNewTask,
  onNewEvent,
  savingName,
  readOnly,
}: HighlightsPanelProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(opportunity.name);
  const currency = opportunity.currency ?? 'USD';
  const forecast = opportunity.forecastCategory ?? forecastCategoryForStage(opportunity.stage);

  function commitName() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== opportunity.name) onNameSave(trimmed);
    setEditingName(false);
  }

  return (
    <LightningCard sticky className="px-5 py-4 sf-record-header">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#706e6b] mb-1">Opportunity</p>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 min-w-0 space-y-3">
          {editingName && !readOnly ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') {
                  setNameDraft(opportunity.name);
                  setEditingName(false);
                }
              }}
              disabled={savingName}
              className="w-full text-2xl font-bold text-[#181818] border-b-2 border-[#0176D3] bg-transparent outline-none"
            />
          ) : (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (readOnly) return;
                setNameDraft(opportunity.name);
                setEditingName(true);
              }}
              className={cn(
                'text-left text-2xl font-bold text-[#181818] truncate max-w-full',
                !readOnly && 'hover:text-[#0176D3] transition-colors'
              )}
              title={readOnly ? undefined : 'Click to edit name'}
            >
              {opportunity.name}
            </button>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-[#706e6b]">Account </span>
              <Link
                href={`/brands/${opportunity.account.id}`}
                className="text-[#0176D3] hover:underline font-medium"
              >
                {opportunity.account.name}
              </Link>
            </div>
            <div className="flex items-center gap-1.5 text-[#181818]">
              <Calendar className="w-3.5 h-3.5 text-[#706e6b]" />
              <span className="text-[#706e6b]">Close </span>
              {formatOpportunityDate(opportunity.closeDate)}
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#706e6b]" />
              <span className="text-[#706e6b]">Amount </span>
              <span className="font-semibold tabular-nums text-right">
                {formatOpportunityCurrency(opportunity.amount, currency)}
              </span>
              {opportunity.amountLocked && (
                <span className="text-[10px] text-[#706e6b]">(from products)</span>
              )}
            </div>
            <div>
              <span className="text-[#706e6b]">Stage </span>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ml-1',
                  stageBadgeClass(opportunity.stage)
                )}
              >
                {opportunity.stage}
              </span>
            </div>
            <div>
              <span className="text-[#706e6b]">Forecast </span>
              <span className="inline-flex items-center rounded-full border border-[#c9c9c9] bg-[#f3f3f3] px-2.5 py-0.5 text-xs font-semibold ml-1">
                {forecast}
              </span>
            </div>
            <div>
              <span className="text-[#706e6b]">Probability </span>
              <span className="font-medium tabular-nums">{opportunity.probability}%</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#706e6b]" />
              <span className="text-[#706e6b]">Owner </span>
              <OwnerAvatar owner={opportunity.owner} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {readOnly ? (
            <>
              {onReopen && <ActionBtn icon={RotateCcw} label="Reopen Opportunity" onClick={onReopen} />}
              <ActionBtn icon={Copy} label="Clone" onClick={onClone} />
            </>
          ) : (
            <>
              <ActionBtn icon={Edit3} label="Edit" onClick={onEdit} />
              <ActionBtn icon={Trash2} label="Delete" onClick={onDelete} variant="danger" />
              <ActionBtn icon={Copy} label="Clone" onClick={onClone} />
              <ActionBtn icon={Phone} label="Log a Call" onClick={onLogCall} />
              <ActionBtn icon={Plus} label="New Task" onClick={onNewTask} />
              <ActionBtn icon={LogOut} label="New Event" onClick={onNewEvent} />
            </>
          )}
        </div>
      </div>
    </LightningCard>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: typeof Edit3;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors',
        variant === 'danger'
          ? 'border-red-200 text-red-700 hover:bg-red-50'
          : 'border-[#c9c9c9] bg-white text-[#0176D3] hover:bg-[#f3f3f3]'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
