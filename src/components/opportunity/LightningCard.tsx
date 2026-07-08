'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function LightningCard({
  children,
  className,
  sticky,
}: {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded bg-white shadow-[0_2px_2px_rgba(0,0,0,0.05)] border border-[#e5e5e5]',
        sticky && 'sticky top-0 z-20',
        className
      )}
    >
      {children}
    </div>
  );
}

export function LightningSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-[#e5e5e5] last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[#181818] hover:bg-[#f3f3f3] [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-xs text-[#706e6b] group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
