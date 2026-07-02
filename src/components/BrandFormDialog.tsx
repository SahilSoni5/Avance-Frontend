'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, UserPlus, Building2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Button, Dialog, Input, Select } from './ui';
import { IndustrySelectField, resolveIndustryValue } from './IndustrySelectField';
import { cn } from '../lib/utils';

export interface PocFormRow {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
}

const EMPTY_POC: PocFormRow = {
  firstName: '',
  lastName: '',
  jobTitle: '',
  email: '',
  phone: '',
};

interface BrandOption {
  id: string;
  name: string;
}

export type BrandFormMode = 'new' | 'existing';

interface BrandFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    mode: BrandFormMode;
    brand?: { name: string; industry: string; website: string; phone: string; email: string };
    accountId?: string;
    pocs: PocFormRow[];
  }) => void;
  loading?: boolean;
  initialMode?: BrandFormMode;
  initialBrandId?: string;
  industries: string[];
}

function PocFields({
  index,
  poc,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  poc: PocFormRow;
  onChange: (next: PocFormRow) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const set = (key: keyof PocFormRow, value: string) => onChange({ ...poc, [key]: value });

  return (
    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          POC {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            aria-label="Remove POC"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">First Name *</label>
          <Input value={poc.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="First name" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Last Name *</label>
          <Input value={poc.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Last name" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Designation / Job Title</label>
          <Input value={poc.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="e.g. Marketing Manager" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input type="email" value={poc.email} onChange={(e) => set('email', e.target.value)} placeholder="poc@brand.com" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Phone</label>
          <Input value={poc.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 ..." />
        </div>
      </div>
    </div>
  );
}

export function BrandFormDialog({
  open,
  onClose,
  onSubmit,
  loading,
  initialMode = 'new',
  initialBrandId = '',
  industries,
}: BrandFormDialogProps) {
  const [mode, setMode] = useState<BrandFormMode>(initialMode);
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState(initialBrandId);
  const [pocs, setPocs] = useState<PocFormRow[]>([{ ...EMPTY_POC }]);
  const [error, setError] = useState('');

  const { data: brandsData } = useQuery({
    queryKey: ['brands-picker'],
    queryFn: () => apiFetch<{ data: BrandOption[] }>('/brands?limit=200'),
    enabled: open && mode === 'existing',
  });

  const brands = brandsData?.data ?? [];

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setAccountId(initialBrandId);
    }
  }, [open, initialMode, initialBrandId]);

  function resetForm() {
    setMode(initialMode);
    setBrandName('');
    setIndustry('');
    setCustomIndustry('');
    setWebsite('');
    setPhone('');
    setEmail('');
    setAccountId(initialBrandId);
    setPocs([{ ...EMPTY_POC }]);
    setError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function addPoc() {
    setPocs((prev) => [...prev, { ...EMPTY_POC }]);
  }

  function updatePoc(index: number, next: PocFormRow) {
    setPocs((prev) => prev.map((p, i) => (i === index ? next : p)));
  }

  function removePoc(index: number) {
    setPocs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const filledPocs = pocs.filter((p) => p.firstName.trim() || p.lastName.trim());
    const validPocs = filledPocs.filter((p) => p.firstName.trim() && p.lastName.trim());

    if (mode === 'new') {
      if (!brandName.trim()) {
        setError('Brand name is required.');
        return;
      }
      if (filledPocs.length > 0 && validPocs.length !== filledPocs.length) {
        setError('Each POC needs both first and last name.');
        return;
      }
      const resolvedIndustry = resolveIndustryValue(industry, customIndustry);
      if (industry === 'Other' && !resolvedIndustry) {
        setError('Please specify the industry.');
        return;
      }
      onSubmit({
        mode: 'new',
        brand: {
          name: brandName.trim(),
          industry: resolvedIndustry,
          website,
          phone,
          email,
        },
        pocs: validPocs,
      });
      return;
    }

    if (!accountId) {
      setError('Select an existing brand.');
      return;
    }
    if (validPocs.length === 0) {
      setError('Add at least one POC with first and last name.');
      return;
    }
    if (filledPocs.length > validPocs.length) {
      setError('Each POC needs both first and last name.');
      return;
    }

    onSubmit({ mode: 'existing', accountId, pocs: validPocs });
  }

  const title = mode === 'new' ? 'New Brand' : 'Add POC to Brand';

  return (
    <Dialog open={open} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Mode toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/40">
          <button
            type="button"
            onClick={() => setMode('new')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              mode === 'new' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Building2 className="w-3.5 h-3.5" /> New Brand
          </button>
          <button
            type="button"
            onClick={() => setMode('existing')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              mode === 'existing' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <UserPlus className="w-3.5 h-3.5" /> Add to Existing
          </button>
        </div>

        {mode === 'new' ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand Details</p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Brand Name <span className="text-red-500">*</span></label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand name" />
            </div>
            <IndustrySelectField
              industries={industries}
              value={industry}
              customValue={customIndustry}
              onChange={setIndustry}
              onCustomChange={setCustomIndustry}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Website</label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Existing Brand <span className="text-red-500">*</span></label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Select brand...</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>
        )}

        {/* POCs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Points of Contact {mode === 'existing' && <span className="text-red-500">*</span>}
            </p>
            <button
              type="button"
              onClick={addPoc}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
            >
              <Plus className="w-3.5 h-3.5" /> Add another POC
            </button>
          </div>
          {pocs.map((poc, i) => (
            <PocFields
              key={i}
              index={i}
              poc={poc}
              onChange={(next) => updatePoc(i, next)}
              onRemove={() => removePoc(i)}
              canRemove={pocs.length > 1}
            />
          ))}
          {mode === 'new' && (
            <p className="text-xs text-muted-foreground">POCs are optional when creating a brand. You can add more later.</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-0 bg-card">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : mode === 'new' ? 'Create Brand' : 'Add POC(s)'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
