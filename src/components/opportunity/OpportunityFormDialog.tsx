'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import type {
  CreateOpportunityInput,
  Opportunity,
  OpportunityPatch,
} from '@/api/opportunities.types';
import {
  LOSS_REASONS,
  OPPORTUNITY_LEAD_SOURCES,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TYPES,
  STAGE_PROBABILITY,
} from './constants';
import { AccountLookup } from './AccountLookup';
import { cn } from '@/lib/utils';

type FormState = {
  name: string;
  accountId: string;
  accountName: string;
  closeDate: string;
  amount: string;
  stage: string;
  probability: string;
  type: string;
  leadSource: string;
  nextStep: string;
  description: string;
  lossReason: string;
  primaryCampaignSource: string;
  budgetConfirmed: boolean;
  discoveryCompleted: boolean;
  roiAnalysisCompleted: boolean;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

export type OpportunityFormPayload = CreateOpportunityInput & OpportunityPatch;

interface OpportunityFormDialogProps {
  open: boolean;
  opportunity?: Opportunity | null;
  loading?: boolean;
  error?: string | null;
  amountLocked?: boolean;
  onClose: () => void;
  onSave: (payload: OpportunityFormPayload) => void;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function emptyForm(): FormState {
  return {
    name: '',
    accountId: '',
    accountName: '',
    closeDate: '',
    amount: '',
    stage: 'Prospecting',
    probability: String(STAGE_PROBABILITY.Prospecting ?? 10),
    type: '',
    leadSource: '',
    nextStep: '',
    description: '',
    lossReason: '',
    primaryCampaignSource: '',
    budgetConfirmed: false,
    discoveryCompleted: false,
    roiAnalysisCompleted: false,
  };
}

function fromOpportunity(opportunity: Opportunity): FormState {
  return {
    name: opportunity.name ?? '',
    accountId: opportunity.accountId || opportunity.account?.id || '',
    accountName:
      opportunity.account?.name && opportunity.account.name !== '—'
        ? opportunity.account.name
        : '',
    closeDate: opportunity.closeDate ? opportunity.closeDate.slice(0, 10) : '',
    amount:
      opportunity.amount != null && !Number.isNaN(Number(opportunity.amount))
        ? String(opportunity.amount)
        : '',
    stage: opportunity.stage || 'Prospecting',
    probability: String(
      opportunity.probability ?? STAGE_PROBABILITY[opportunity.stage] ?? 10,
    ),
    type: opportunity.type ?? '',
    leadSource: opportunity.leadSource ?? '',
    nextStep: opportunity.nextStep ?? '',
    description: opportunity.description ?? '',
    lossReason: opportunity.lossReason ?? '',
    primaryCampaignSource: '',
    budgetConfirmed: false,
    discoveryCompleted: false,
    roiAnalysisCompleted: false,
  };
}

function formatAmountDisplay(raw: string) {
  if (!raw) return '';
  const [whole, fraction] = raw.split('.');
  const digits = whole.replace(/\D/g, '');
  if (!digits) return fraction != null ? `0.${fraction}` : '';
  const withCommas = Number(digits).toLocaleString('en-US');
  return fraction != null
    ? `${withCommas}.${fraction.replace(/\D/g, '').slice(0, 2)}`
    : withCommas;
}

function parseAmountInput(display: string) {
  const cleaned = display.replace(/,/g, '');
  if (!cleaned) return '';
  if (!/^\d*\.?\d{0,2}$/.test(cleaned)) return null;
  return cleaned;
}

function validate(form: FormState, isCreate: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = 'Complete this field.';
  if (!form.accountId) errors.accountId = 'Complete this field.';
  if (!form.closeDate) {
    errors.closeDate = 'Complete this field.';
  } else if (isCreate && form.closeDate < todayISO()) {
    errors.closeDate = 'Close Date cannot be in the past.';
  }
  if (!form.stage) errors.stage = 'Complete this field.';

  if (form.amount.trim()) {
    const amount = Number(form.amount);
    if (Number.isNaN(amount) || amount < 0)
      errors.amount = 'Enter a valid non-negative amount.';
  }

  if (form.probability.trim()) {
    const probability = Number(form.probability);
    if (Number.isNaN(probability) || probability < 0 || probability > 100) {
      errors.probability = 'Enter a value between 0 and 100.';
    }
  } else {
    errors.probability = 'Complete this field.';
  }

  if (form.stage === 'Closed Lost' && !form.lossReason) {
    errors.lossReason = 'Loss Reason is required.';
  }

  return errors;
}

export function OpportunityFormDialog({
  open,
  opportunity = null,
  loading,
  error,
  amountLocked,
  onClose,
  onSave,
}: OpportunityFormDialogProps) {
  const isEdit = !!opportunity;
  const lockAmount = amountLocked ?? opportunity?.amountLocked ?? false;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saveAndNew, setSaveAndNew] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(opportunity ? fromOpportunity(opportunity) : emptyForm());
    setTouched({});
    setSubmitted(false);
    setSaveAndNew(false);
  }, [open, opportunity]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, loading, onClose]);

  const errors = useMemo(() => validate(form, !isEdit), [form, isEdit]);
  const hasBlockingErrors = Object.keys(errors).length > 0;
  const canSave = !hasBlockingErrors;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function markTouched(key: keyof FormState) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function showError(key: keyof FormState) {
    return (submitted || touched[key]) && errors[key] ? errors[key] : null;
  }

  function handleStageChange(stage: string) {
    setForm((prev) => ({
      ...prev,
      stage,
      probability: String(STAGE_PROBABILITY[stage] ?? prev.probability),
    }));
  }

  function handleAmountChange(display: string) {
    const parsed = parseAmountInput(display);
    if (parsed === null) return;
    setField('amount', parsed);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(form, !isEdit)).length > 0) return;

    const payload: OpportunityFormPayload = {
      name: form.name.trim(),
      accountId: form.accountId,
      closeDate: form.closeDate,
      stage: form.stage,
      probability: Number(form.probability),
      type: form.type || null,
      leadSource: form.leadSource || null,
      nextStep: form.nextStep.trim() || null,
      description: form.description.trim() || null,
      lossReason: form.stage === 'Closed Lost' ? form.lossReason || null : null,
    };
    if (!lockAmount) {
      payload.amount = form.amount.trim() ? Number(form.amount) : null;
    }
    onSave(payload);
    if (saveAndNew && !isEdit) {
      setForm(emptyForm());
      setTouched({});
      setSubmitted(false);
      setSaveAndNew(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog backdrop"
        onClick={() => !loading && onClose()}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="opportunity-form-title"
        className="opportunity-page relative z-10 flex h-full w-full max-w-[760px] flex-col bg-white shadow-2xl border-l border-[#c9c9c9]"
        style={{ borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}
      >
        <header className="flex items-center justify-between border-b border-[#c9c9c9] px-5 py-3 shrink-0 bg-white">
          <h2 id="opportunity-form-title" className="text-lg font-bold text-[#181818]">
            {isEdit ? 'Edit Opportunity' : 'New Opportunity'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded text-[#706e6b] hover:bg-[#f3f3f3] hover:text-[#181818] disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {error && (
              <div className="mb-4 rounded border border-[#f4e0e2] bg-[#fef7f7] px-3 py-2 text-sm text-[#ba0517]">
                {error}
              </div>
            )}

            <section className="rounded border border-[#dddbda] bg-white">
              <div className="mb-3 border-b border-[#e5e5e5] pb-2">
                <h3 className="px-3 pt-2 text-sm font-bold text-[#181818]">
                  Opportunity Information
                </h3>
              </div>

              <div className="grid grid-cols-1 min-[700px]:grid-cols-2 gap-x-6 gap-y-4 px-3 pb-3">
                <Field label="Opportunity Name" required error={showError('name')}>
                  <input
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    onBlur={() => markTouched('name')}
                    className={fieldClass(!!showError('name'))}
                  />
                </Field>

                <Field label="Account Name" required error={showError('accountId')}>
                  <AccountLookup
                    valueId={form.accountId}
                    valueName={form.accountName}
                    disabled={loading}
                    error={showError('accountId')}
                    onChange={(account) => {
                      setForm((prev) => ({
                        ...prev,
                        accountId: account?.id ?? '',
                        accountName: account?.name ?? '',
                      }));
                      markTouched('accountId');
                    }}
                  />
                  {!form.accountId && form.accountName && (
                    <span className="block text-[11px] text-[#706e6b]">
                      Select an account from the dropdown results.
                    </span>
                  )}
                </Field>

                <Field label="Close Date" required error={showError('closeDate')}>
                  <input
                    type="date"
                    value={form.closeDate}
                    min={!isEdit ? todayISO() : undefined}
                    onChange={(e) => setField('closeDate', e.target.value)}
                    onBlur={() => markTouched('closeDate')}
                    className={fieldClass(!!showError('closeDate'))}
                  />
                </Field>

                <Field label="Opportunity Owner">
                  <input
                    value={
                      opportunity
                        ? `${opportunity.owner.firstName} ${opportunity.owner.lastName}`
                        : 'Current User'
                    }
                    className={cn(fieldClass(false), 'bg-[#f3f3f3] text-[#706e6b]')}
                    disabled
                  />
                </Field>

                <Field label="Stage" required error={showError('stage')}>
                  <select
                    value={form.stage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    onBlur={() => markTouched('stage')}
                    className={fieldClass(!!showError('stage'))}
                  >
                    {OPPORTUNITY_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Probability (%)" error={showError('probability')}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.probability}
                    onChange={(e) => setField('probability', e.target.value)}
                    onBlur={() => markTouched('probability')}
                    className={cn(fieldClass(!!showError('probability')), 'text-right tabular-nums')}
                  />
                </Field>

                <Field label="Amount" error={showError('amount')}>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[#706e6b]">$</span>
                    <input
                      inputMode="decimal"
                      value={formatAmountDisplay(form.amount)}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      onBlur={() => markTouched('amount')}
                      disabled={lockAmount}
                      className={cn(
                        fieldClass(!!showError('amount')),
                        'pl-5 text-right tabular-nums',
                        lockAmount && 'bg-[#f3f3f3] text-[#706e6b]',
                      )}
                      placeholder="0.00"
                    />
                  </div>
                  {lockAmount && (
                    <span className="block text-[11px] text-[#706e6b]">
                      Amount is calculated from products and cannot be edited.
                    </span>
                  )}
                </Field>

                <Field label="Type">
                  <select
                    value={form.type}
                    onChange={(e) => setField('type', e.target.value)}
                    className={fieldClass(false)}
                  >
                    <option value="">—None—</option>
                    {OPPORTUNITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Primary Campaign Source">
                  <input
                    value={form.primaryCampaignSource}
                    onChange={(e) => setField('primaryCampaignSource', e.target.value)}
                    className={fieldClass(false)}
                    placeholder="Search Campaigns..."
                  />
                </Field>

                <Field label="Budget Confirmed">
                  <input
                    type="checkbox"
                    checked={form.budgetConfirmed}
                    onChange={(e) => setField('budgetConfirmed', e.target.checked)}
                    className="h-4 w-4 accent-[#0176D3]"
                  />
                </Field>

                <Field label="Discovery Completed">
                  <input
                    type="checkbox"
                    checked={form.discoveryCompleted}
                    onChange={(e) => setField('discoveryCompleted', e.target.checked)}
                    className="h-4 w-4 accent-[#0176D3]"
                  />
                </Field>

                <Field label="ROI Analysis Completed">
                  <input
                    type="checkbox"
                    checked={form.roiAnalysisCompleted}
                    onChange={(e) => setField('roiAnalysisCompleted', e.target.checked)}
                    className="h-4 w-4 accent-[#0176D3]"
                  />
                </Field>

                {form.stage === 'Closed Lost' && (
                  <Field label="Loss Reason" required error={showError('lossReason')}>
                    <select
                      value={form.lossReason}
                      onChange={(e) => setField('lossReason', e.target.value)}
                      onBlur={() => markTouched('lossReason')}
                      className={fieldClass(!!showError('lossReason'))}
                    >
                      <option value="">—None—</option>
                      {LOSS_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            </section>

            <section className="mt-3 rounded border border-[#dddbda] bg-white">
              <div className="mb-3 border-b border-[#e5e5e5] pb-2">
                <h3 className="px-3 pt-2 text-sm font-bold text-[#181818]">
                  Additional Information
                </h3>
              </div>
              <div className="grid grid-cols-1 min-[700px]:grid-cols-2 gap-x-6 gap-y-4 px-3 pb-3">
                <Field label="Next Step">
                  <input
                    value={form.nextStep}
                    onChange={(e) => setField('nextStep', e.target.value)}
                    className={fieldClass(false)}
                  />
                </Field>

                <Field label="Lead Source">
                  <select
                    value={form.leadSource}
                    onChange={(e) => setField('leadSource', e.target.value)}
                    className={fieldClass(false)}
                  >
                    <option value="">—None—</option>
                    {OPPORTUNITY_LEAD_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Description" className="min-[700px]:col-span-2">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    className={cn(fieldClass(false), 'resize-y')}
                  />
                </Field>
              </div>
            </section>
          </div>

          <footer className="flex justify-end gap-2 border-t border-[#c9c9c9] bg-[#f3f3f3] px-5 py-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded px-4 py-2 text-sm font-semibold text-[#0176D3] border border-[#c9c9c9] bg-white hover:bg-[#f3f3f3] disabled:opacity-50"
              style={{ borderRadius: 4 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isEdit}
              onClick={() => setSaveAndNew(true)}
              className="rounded px-4 py-2 text-sm font-semibold text-[#0176D3] border border-[#c9c9c9] bg-white hover:bg-[#f3f3f3] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 4 }}
            >
              Save &amp; New
            </button>
            <button
              type="submit"
              disabled={loading}
              onClick={() => setSaveAndNew(false)}
              className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white bg-[#0176D3] hover:bg-[#014486] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: 4 }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-xs font-semibold text-[#3e3e3c]">
        {label}
        {required && <span className="text-[#ba0517] ml-0.5">*</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-[#ba0517]">{error}</span>}
    </label>
  );
}

function fieldClass(hasError: boolean) {
  return cn(
    'w-full rounded border bg-white px-2 py-1.5 text-sm text-[#181818] outline-none',
    hasError
      ? 'border-[#ba0517] focus:border-[#ba0517] focus:ring-1 focus:ring-[#ba0517]'
      : 'border-[#c9c9c9] focus:border-[#0176D3] focus:ring-1 focus:ring-[#0176D3]',
  );
}
