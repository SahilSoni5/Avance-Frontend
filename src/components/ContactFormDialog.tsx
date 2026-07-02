'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog, Input, Select } from './ui';

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  status: string;
  brandName: string;
}

const EMPTY: ContactFormValues = {
  firstName: '',
  lastName: '',
  jobTitle: '',
  email: '',
  phone: '',
  status: 'Lead',
  brandName: '',
};

interface ContactFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ContactFormValues) => void;
  loading?: boolean;
  submitError?: string | null;
  title?: string;
  submitLabel?: string;
  initialValues?: Partial<ContactFormValues>;
}

export function ContactFormDialog({
  open,
  onClose,
  onSubmit,
  loading,
  submitError,
  title = 'New Contact',
  submitLabel = 'Create Contact',
  initialValues,
}: ContactFormDialogProps) {
  const [values, setValues] = useState<ContactFormValues>({ ...EMPTY, ...initialValues });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValues({ ...EMPTY, ...initialValues });
      setError('');
    }
  }, [open, initialValues]);

  function set<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.firstName.trim() || !values.lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    const email = values.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address or leave it blank.');
      return;
    }
    setError('');
    onSubmit({
      ...values,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      jobTitle: values.jobTitle.trim(),
      brandName: values.brandName.trim(),
      email,
      phone: values.phone.trim(),
    });
  }

  const displayError = error || submitError;

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Type a brand name to link this contact as a POC. If the brand does not exist yet, it will be created automatically.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">First Name *</label>
            <Input value={values.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Last Name *</label>
            <Input value={values.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Brand name</label>
          <Input
            value={values.brandName}
            onChange={(e) => set('brandName', e.target.value)}
            placeholder="e.g. Acme Corp (optional)"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Designation / Job Title</label>
          <Input value={values.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="e.g. Marketing Manager" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input type="email" value={values.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Phone</label>
            <Input value={values.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Status</label>
          <Select value={values.status} onChange={(e) => set('status', e.target.value)}>
            <option value="Lead">Lead</option>
            <option value="Prospect">Prospect</option>
            <option value="Active">Active</option>
            <option value="Customer">Customer</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>

        {displayError && <p className="text-sm text-red-500">{displayError}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function contactFormToApiBody(values: ContactFormValues, opts?: { includeEmptyBrand?: boolean }) {
  const linkedToBrand = Boolean(values.brandName);
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
    status: linkedToBrand && values.status === 'Lead' ? 'Active' : values.status || 'Lead',
    ...(values.brandName || opts?.includeEmptyBrand ? { accountName: values.brandName } : {}),
    ...(values.email ? { emails: [{ email: values.email, isPrimary: true }] } : {}),
    ...(values.phone ? { phones: [{ phone: values.phone, isPrimary: true }] } : {}),
  };
}
