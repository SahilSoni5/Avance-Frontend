'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import {
  LOSS_REASONS,
  OPPORTUNITY_STAGES,
  SF_COMPLETED,
  SF_FUTURE,
  SF_PRIMARY,
  STAGE_PROBABILITY,
  stageIndex,
} from './constants';
import { LightningCard } from './LightningCard';
import { cn } from '@/lib/utils';

interface StagePathTrackerProps {
  currentStage: string;
  onStageChange: (stage: string, lossReason?: string) => void;
  updating?: boolean;
  readOnly?: boolean;
}

export function StagePathTracker({
  currentStage,
  onStageChange,
  updating,
  readOnly,
}: StagePathTrackerProps) {
  const [popoverStage, setPopoverStage] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState('');
  const [lossError, setLossError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const currentIdx = stageIndex(currentStage);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverStage(null);
        setLossReason('');
        setLossError(null);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function stepState(idx: number): 'completed' | 'current' | 'future' {
    if (currentIdx < 0) return idx === 0 ? 'current' : 'future';
    if (idx < currentIdx) return 'completed';
    if (idx === currentIdx) return 'current';
    return 'future';
  }

  function confirmStage(stage: string) {
    if (stage === 'Closed Lost' && !lossReason) {
      setLossError('Loss Reason is required.');
      return;
    }
    onStageChange(stage, stage === 'Closed Lost' ? lossReason : undefined);
    setPopoverStage(null);
    setLossReason('');
    setLossError(null);
  }

  return (
    <LightningCard className="px-2 py-3 mt-3 overflow-x-auto">
      <div className="flex items-stretch min-w-max">
        {OPPORTUNITY_STAGES.map((stage, idx) => {
          const state = stepState(idx);
          const isLast = idx === OPPORTUNITY_STAGES.length - 1;
          const bg =
            state === 'completed' ? SF_COMPLETED : state === 'current' ? SF_PRIMARY : SF_FUTURE;
          const textColor = state === 'future' ? '#706e6b' : '#fff';

          return (
            <div key={stage} className="flex items-stretch relative">
              <button
                type="button"
                disabled={updating || readOnly}
                onClick={() => {
                  if (readOnly) return;
                  setPopoverStage(stage);
                  setLossReason('');
                  setLossError(null);
                }}
                className={cn(
                  'relative flex items-center gap-1 px-3 py-2 text-xs font-semibold transition-opacity min-h-[40px]',
                  'first:rounded-l last:rounded-r',
                  (updating || readOnly) && 'opacity-60 cursor-not-allowed'
                )}
                style={{
                  backgroundColor: bg,
                  color: textColor,
                  clipPath: isLast
                    ? undefined
                    : 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)',
                  paddingRight: isLast ? 12 : 20,
                  paddingLeft: idx === 0 ? 12 : 20,
                  marginRight: isLast ? 0 : -4,
                  zIndex: OPPORTUNITY_STAGES.length - idx,
                }}
              >
                {state === 'completed' && <Check className="w-3 h-3 shrink-0" />}
                <span className="whitespace-nowrap max-w-[120px] truncate" title={stage}>
                  {stage}
                </span>
              </button>

              {popoverStage === stage && !readOnly && (
                <div
                  ref={popoverRef}
                  className="absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 rounded border border-[#c9c9c9] bg-white p-4 shadow-lg"
                >
                  <p className="text-sm font-semibold text-[#181818] mb-1">Mark Stage as Complete?</p>
                  <p className="text-xs text-[#706e6b] mb-3">
                    Move this opportunity to <strong>{stage}</strong>
                    {STAGE_PROBABILITY[stage] !== undefined && (
                      <> ({STAGE_PROBABILITY[stage]}% probability)</>
                    )}
                  </p>
                  {stage === 'Closed Lost' && (
                    <label className="block mb-3">
                      <span className="text-xs font-semibold text-[#3e3e3c]">
                        Loss Reason <span className="text-[#ba0517]">*</span>
                      </span>
                      <select
                        value={lossReason}
                        onChange={(e) => {
                          setLossReason(e.target.value);
                          setLossError(null);
                        }}
                        className="mt-1 w-full rounded border border-[#c9c9c9] px-2 py-1.5 text-sm"
                      >
                        <option value="">—None—</option>
                        {LOSS_REASONS.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                      {lossError && <span className="mt-1 block text-xs text-[#ba0517]">{lossError}</span>}
                    </label>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setPopoverStage(null);
                        setLossReason('');
                        setLossError(null);
                      }}
                      className="px-3 py-1.5 text-xs border border-[#c9c9c9] rounded hover:bg-[#f3f3f3]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmStage(stage)}
                      className="px-3 py-1.5 text-xs rounded bg-[#0176D3] text-white hover:bg-[#014486]"
                    >
                      Mark Complete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </LightningCard>
  );
}
