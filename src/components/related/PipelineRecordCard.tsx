'use client';

import Link from 'next/link';
import { formatCurrencyINR, formatDateIST } from '@/lib/locale';
import { cn } from '@/lib/utils';

export interface PipelineRecord {
  id: string;
  name: string;
  value: number | string | null;
  stage: string;
  closeDate?: string | null;
  probability?: number | null;
  visible: boolean;
  recordType: 'deal' | 'opportunity';
  owner: { firstName: string; lastName: string };
}

function recordHref(record: PipelineRecord): string | null {
  if (record.recordType === 'opportunity') return `/opportunities/${record.id}`;
  return null;
}

export function PipelineRecordCard({ record, compact }: { record: PipelineRecord; compact?: boolean }) {
  const href = recordHref(record);
  const isWon = record.stage === 'Closed Won' || record.stage === 'WON';
  const isLost = record.stage === 'Closed Lost' || record.stage === 'LOST';

  return (
    <div className={cn('p-3 rounded-xl border border-border/40', compact ? 'bg-transparent border-0 p-0' : 'bg-muted/40')}>
      <div className="flex items-start justify-between gap-2">
        {href ? (
          <Link href={href} className="text-sm font-medium text-primary hover:underline">
            {record.name}
          </Link>
        ) : (
          <p className="text-sm font-medium text-foreground">{record.name}</p>
        )}
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
          {record.recordType}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
        <span
          className={cn(
            'px-2 py-0.5 rounded-full',
            isWon ? 'bg-green-100 text-green-700' : isLost ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
          )}
        >
          {record.stage}
        </span>
        {record.value != null && (
          <span className="font-semibold text-foreground">{formatCurrencyINR(record.value)}</span>
        )}
        {record.closeDate && !compact && <span>Closes {formatDateIST(record.closeDate)}</span>}
        {record.probability != null && !compact && <span>{record.probability}% probability</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Owner: {record.owner.firstName} {record.owner.lastName}
      </p>
    </div>
  );
}
