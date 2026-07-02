'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm', className)}>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-slate-500 hover:text-primary dark:text-slate-400"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="text-slate-500 hover:text-primary dark:text-slate-400"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
