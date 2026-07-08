'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface AccountOption {
  id: string;
  name: string;
}

interface AccountLookupProps {
  valueId: string;
  valueName: string;
  onChange: (account: AccountOption | null) => void;
  error?: string | null;
  disabled?: boolean;
}

export function AccountLookup({
  valueId,
  valueName,
  onChange,
  error,
  disabled,
}: AccountLookupProps) {
  const [query, setQuery] = useState(valueName);
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(valueName);
  }, [valueName]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (valueId && valueName) setQuery(valueName);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [valueId, valueName]);

  const { data, isFetching } = useQuery({
    queryKey: ['accounts-lookup', debounced],
    queryFn: () =>
      apiFetch<{ data: AccountOption[] }>(
        `/accounts?limit=20${debounced ? `&search=${encodeURIComponent(debounced)}` : ''}`
      ),
    enabled: open,
  });

  const options = useMemo(() => data?.data ?? [], [data]);
  const normalizedQuery = query.trim().toLowerCase();
  const hasExactMatch = options.some(
    (opt) => opt.name.trim().toLowerCase() === normalizedQuery,
  );

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ data: AccountOption }>('/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }),
    onSuccess: (res) => {
      setCreateError(null);
      select(res.data);
    },
    onError: (err: Error) => {
      setCreateError(err.message || 'Failed to create account.');
    },
  });

  function autoSelectFromQuery() {
    if (valueId || !query.trim()) return false;
    const normalized = query.trim().toLowerCase();
    const exact = options.find((opt) => opt.name.trim().toLowerCase() === normalized);
    if (exact) {
      select(exact);
      return true;
    }
    if (options.length === 1) {
      select(options[0]);
      return true;
    }
    return false;
  }

  function select(account: AccountOption) {
    onChange(account);
    setQuery(account.name);
    setOpen(false);
    setCreateError(null);
  }

  function clear() {
    onChange(null);
    setQuery('');
    setOpen(true);
    setCreateError(null);
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          'flex items-center gap-1 rounded border bg-white px-2',
          error ? 'border-[#ba0517]' : 'border-[#c9c9c9] focus-within:border-[#0176D3] focus-within:ring-1 focus-within:ring-[#0176D3]'
        )}
      >
        <Search className="w-3.5 h-3.5 text-[#706e6b] shrink-0" />
        <input
          value={query}
          disabled={disabled}
          placeholder="Search Accounts..."
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Let list-item click run first, then resolve typed query.
            window.setTimeout(() => {
              autoSelectFromQuery();
            }, 120);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              autoSelectFromQuery();
              setOpen(false);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setCreateError(null);
            if (valueId) onChange(null);
          }}
          className="w-full py-1.5 text-sm outline-none bg-transparent"
          aria-invalid={!!error}
          aria-autocomplete="list"
        />
        {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#706e6b]" />}
        {(valueId || query) && !disabled && (
          <button type="button" onClick={clear} className="p-0.5 text-[#706e6b] hover:text-[#181818]" aria-label="Clear account">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded border border-[#c9c9c9] bg-white shadow-lg">
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[#706e6b]">
              {isFetching ? 'Searching…' : 'No accounts found'}
            </li>
          ) : (
            options.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => select(account)}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-[#f3f9ff]',
                    account.id === valueId && 'bg-[#eef4ff] text-[#0176D3] font-semibold'
                  )}
                >
                  {account.name}
                </button>
              </li>
            ))
          )}
          {!disabled && query.trim() && !hasExactMatch && !isFetching && (
            <li className="border-t border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => createMutation.mutate(query.trim())}
                disabled={createMutation.isPending}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-[#0176D3] hover:bg-[#f3f9ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>Create account "{query.trim()}"</span>
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </button>
            </li>
          )}
          {createError && (
            <li className="border-t border-[#f4e0e2] px-3 py-2 text-xs text-[#ba0517]">
              {createError}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
