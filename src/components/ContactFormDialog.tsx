'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { Button, Dialog, Input, Select } from './ui';

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  status: string;
  accountId: string;
}

const EMPTY: ContactFormValues = {
  firstName: '',
  lastName: '',
  jobTitle: '',
  email: '',
  phone: '',
  status: 'Lead',
  accountId: '',
};

interface BrandOption {
  id: string;
  name: string;
}

interface ContactFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ContactFormValues) => void;
  loading?: boolean;
  title?: string;
  submitLabel?: string;
  initialValues?: Partial<ContactFormValues>;
}

export function ContactFormDialog({
  open,
  onClose,
  onSubmit,
  loading,
  title = 'New Contact',
  submitLabel = 'Create Contact',
  initialValues,
}: ContactFormDialogProps) {
  const [values, setValues] = useState<ContactFormValues>({ ...EMPTY, ...initialValues });
  const [error, setError] = useState('');

  const { data: brandsData } = useQuery({
    queryKey: ['brands-picker'],
    queryFn: () => apiFetch<{ data: BrandOption[] }>('/brands?limit=200'),
    enabled: open,
  });

  const brands = brandsData?.data ?? [];

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
    setError('');
    onSubmit({
      ...values,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      jobTitle: values.jobTitle.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Contacts linked to a brand appear as POCs on that brand&apos;s page, and vice versa.
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
          <label className="text-sm font-medium text-foreground">Brand (POC of)</label>
          <Select value={values.accountId} onChange={(e) => set('accountId', e.target.value)}>
            <option value="">No brand — standalone contact</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
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

        {error && <p className="text-sm text-red-500">{error}</p>}

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

export function contactFormToApiBody(values: ContactFormValues) {
  const linkedToBrand = Boolean(values.accountId);
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
    status: linkedToBrand && values.status === 'Lead' ? 'Active' : values.status || 'Lead',
    ...(values.accountId ? { accountId: values.accountId } : {}),
    ...(values.email ? { emails: [{ email: values.email, isPrimary: true }] } : {}),
    ...(values.phone ? { phones: [{ phone: values.phone, isPrimary: true }] } : {}),
  };
}
