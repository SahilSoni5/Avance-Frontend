'use client';

import type { StageHistoryEntry } from '@/api/opportunities.types';
import { formatOpportunityDateTime } from './utils';
import { LightningCard } from './LightningCard';
import { Loader2 } from 'lucide-react';

interface StageHistoryListProps {
  entries: StageHistoryEntry[];
  loading?: boolean;
}

export function StageHistoryList({ entries, loading }: StageHistoryListProps) {
  return (
    <LightningCard>
      <div className="px-4 py-3 border-b border-[#e5e5e5]">
        <h3 className="text-sm font-bold text-[#181818]">Stage History</h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#706e6b]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
        </div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#706e6b]">No stage changes recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#706e6b] border-b border-[#e5e5e5]">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">From</th>
                <th className="px-4 py-2 font-semibold">To</th>
                <th className="px-4 py-2 font-semibold">Changed By</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-[#f3f3f3]">
                  <td className="px-4 py-2">{formatOpportunityDateTime(entry.changedAt)}</td>
                  <td className="px-4 py-2">{entry.oldStage ?? '—'}</td>
                  <td className="px-4 py-2 font-medium">{entry.newStage}</td>
                  <td className="px-4 py-2">
                    {entry.changedBy.firstName} {entry.changedBy.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LightningCard>
  );
}
