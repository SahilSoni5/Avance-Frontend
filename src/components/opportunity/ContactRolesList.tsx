'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { ContactRole } from '@/api/opportunities.types';
import { LightningSection } from './LightningCard';

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface ContactRolesListProps {
  roles: ContactRole[];
  loading?: boolean;
  onAdd: (input: { contactId: string; role: string; isPrimary: boolean }) => void;
  onRemove: (roleId: string) => void;
  adding?: boolean;
  addError?: string | null;
  readOnly?: boolean;
}

export function ContactRolesList({
  roles,
  loading,
  onAdd,
  onRemove,
  adding,
  addError,
  readOnly,
}: ContactRolesListProps) {
  const [showForm, setShowForm] = useState(false);
  const [contactId, setContactId] = useState('');
  const [role, setRole] = useState('Decision Maker');
  const [isPrimary, setIsPrimary] = useState(false);

  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts-picker'],
    queryFn: () => apiFetch<{ data: ContactOption[] }>('/contacts?limit=100'),
    enabled: showForm,
  });

  const contacts = contactsData?.data ?? [];
  const assignedIds = new Set(roles.map((r) => r.contactId));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId) return;
    onAdd({ contactId, role, isPrimary });
    setContactId('');
    setShowForm(false);
  }

  return (
    <LightningSection title={`Contact Roles (${roles.length})`}>
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[#706e6b] justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading contact roles…
        </div>
      ) : roles.length === 0 && !showForm ? (
        <p className="text-sm text-[#706e6b] py-4 text-center">No contact roles yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#706e6b] border-b border-[#e5e5e5]">
              <th className="pb-2 font-semibold">Name</th>
              <th className="pb-2 font-semibold">Role</th>
              <th className="pb-2 font-semibold">Primary</th>
              <th className="pb-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-[#f3f3f3]">
                <td className="py-2 font-medium">
                  <Link
                    href={`/contacts/${r.contactId}`}
                    className="text-[#0176D3] hover:underline"
                  >
                    {r.contact.firstName} {r.contact.lastName}
                  </Link>
                </td>
                <td className="py-2">{r.role}</td>
                <td className="py-2">
                  <input type="checkbox" checked={r.isPrimary} readOnly className="accent-[#0176D3]" />
                </td>
                <td className="py-2 text-right">
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onRemove(r.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm ? (
        <form onSubmit={submit} className="mt-3 space-y-2 p-3 bg-[#f3f3f3] rounded">
          {contactsLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#706e6b] py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading contacts…
            </div>
          ) : (
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full text-sm border border-[#c9c9c9] rounded px-2 py-1.5"
              required
            >
              <option value="">Select contact…</option>
              {contacts
                .filter((c) => !assignedIds.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
            </select>
          )}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full text-sm border border-[#c9c9c9] rounded px-2 py-1.5"
          >
            <option>Decision Maker</option>
            <option>Economic Buyer</option>
            <option>Evaluator</option>
            <option>Influencer</option>
            <option>Business User</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            Primary
          </label>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={adding || !contactId} className="text-xs px-3 py-1.5 bg-[#0176D3] text-white rounded disabled:opacity-50">
              {adding ? 'Adding…' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 border rounded">
              Cancel
            </button>
          </div>
        </form>
      ) : !readOnly ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 inline-flex items-center gap-1 text-xs text-[#0176D3] font-medium hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add Contact Role
        </button>
      ) : null}
    </LightningSection>
  );
}
