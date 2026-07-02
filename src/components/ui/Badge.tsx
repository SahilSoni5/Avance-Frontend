'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-primary/10 text-primary border-transparent',
  secondary: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-transparent',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-transparent',
  destructive: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-transparent',
  outline: 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300',
} as const;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
