'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog, Input, Select } from './ui';
import { IndustrySelectField, resolveIndustryValue } from './IndustrySelectField';

export interface BrandEditValues {
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  status: string;
}

interface BrandEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: BrandEditValues) => void;
  loading?: boolean;
  error?: string | null;
  industries: string[];
  initial: BrandEditValues;
}

function splitIndustry(industry: string | null | undefined, industries: string[]) {
  if (!industry) return { industry: '', customIndustry: '' };
  if (industries.includes(industry)) return { industry, customIndustry: '' };
  return { industry: 'Other', customIndustry: industry };
}

export function BrandEditDialog({
  open,
  onClose,
  onSave,
  loading,
  error,
  industries,
  initial,
}: BrandEditDialogProps) {
  const [name, setName] = useState(initial.name);
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [website, setWebsite] = useState(initial.website);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [address, setAddress] = useState(initial.address);
  const [status, setStatus] = useState(initial.status);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    const split = splitIndustry(initial.industry, industries);
    setName(initial.name);
    setIndustry(split.industry);
    setCustomIndustry(split.customIndustry);
    setWebsite(initial.website);
    setPhone(initial.phone);
    setEmail(initial.email);
    setAddress(initial.address);
    setStatus(initial.status);
    setFormError('');
  }, [open, initial, industries]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Brand name is required.');
      return;
    }
    const resolvedIndustry = resolveIndustryValue(industry, customIndustry);
    if (industry === 'Other' && !resolvedIndustry) {
      setFormError('Please specify the industry.');
      return;
    }
    onSave({
      name: name.trim(),
      industry: resolvedIndustry,
      website: website.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      status: status.trim(),
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Edit Brand">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Brand Name <span className="text-red-500">*</span>
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand name" />
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

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Address</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, country" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">— None —</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="In Pipeline">In Pipeline</option>
          </Select>
        </div>

        {(formError || error) && (
          <p className="text-sm text-red-500">{formError || error}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-0 bg-card">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
