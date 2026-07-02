'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe, User, Users } from 'lucide-react';
import { Role } from '@crm/shared';
import { useAuthStore } from '../stores/auth.store';
import { cn } from '../lib/utils';
import { Badge } from './ui';

export type ScopeType = 'all' | 'team' | 'self';

const SCOPE_OPTIONS: Record<
  ScopeType,
  { label: string; description: string; icon: typeof Globe }
> = {
  all: { label: 'Org-Wide', description: 'All records in the organization', icon: Globe },
  team: { label: 'My Team', description: 'Records owned by your team', icon: Users },
  self: { label: 'My Records', description: 'Records you own', icon: User },
};

const ROLE_AVAILABLE_SCOPES: Record<Role, ScopeType[]> = {
  [Role.ADMIN]: ['all', 'team', 'self'],
  [Role.BOSS]: ['all', 'team', 'self'],
  [Role.MANAGER]: ['team', 'self'],
  [Role.EMPLOYEE]: ['self'],
  [Role.INTERN]: ['self'],
};

export interface ScopeDropdownProps {
  value?: ScopeType;
  onChange?: (scope: ScopeType) => void;
  className?: string;
}

export function ScopeDropdown({ value, onChange, className }: ScopeDropdownProps) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const available = user ? ROLE_AVAILABLE_SCOPES[user.role] : (['self'] as ScopeType[]);
  const selected = value ?? available[0] ?? 'self';
  const current = SCOPE_OPTIONS[selected];
  const CurrentIcon = current.icon;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (available.length <= 1) {
    return (
      <Badge variant="secondary" className={cn('gap-1.5', className)}>
        <CurrentIcon className="h-3 w-3" />
        Viewing: {current.label}
      </Badge>
    );
  }

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm',
          'hover:bg-muted dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
        )}
      >
        <CurrentIcon className="h-4 w-4 text-primary" />
        <span className="font-medium text-slate-700 dark:text-slate-200">{current.label}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {available.map((scope) => {
            const option = SCOPE_OPTIONS[scope];
            const Icon = option.icon;
            const isActive = scope === selected;
            return (
              <button
                key={scope}
                type="button"
                onClick={() => {
                  onChange?.(scope);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted dark:hover:bg-slate-800',
                  isActive && 'bg-primary/5'
                )}
              >
                <Icon className={cn('mt-0.5 h-4 w-4', isActive ? 'text-primary' : 'text-slate-400')} />
                <div>
                  <p className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-slate-800 dark:text-slate-200')}>
                    {option.label}
                  </p>
                  <p className="text-xs text-slate-500">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
