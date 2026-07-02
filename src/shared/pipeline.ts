/** Default sales pipeline — agency / pitch workflow */
export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Intro Call', order: 1, probability: 10, color: '#94a3b8' },
  { name: 'Meeting Conducted', order: 2, probability: 20, color: '#60a5fa' },
  { name: 'Brief Received', order: 3, probability: 30, color: '#38bdf8' },
  { name: 'Briefing Call', order: 4, probability: 45, color: '#818cf8' },
  { name: 'Pitch Call', order: 5, probability: 55, color: '#a78bfa' },
  { name: 'Feedback Received', order: 6, probability: 70, color: '#f59e0b' },
  { name: 'Not Approved', order: 7, probability: 0, color: '#ef4444' },
  { name: 'Approved', order: 8, probability: 85, color: '#22c55e' },
  { name: 'Executed', order: 9, probability: 100, color: '#16a34a' },
  { name: 'Not Executed', order: 10, probability: 0, color: '#dc2626' },
] as const;

export const PIPELINE_WON_STAGES = ['Executed'] as const;
export const PIPELINE_LOST_STAGES = ['Not Approved', 'Not Executed'] as const;
export const PIPELINE_CLOSED_STAGES = [...PIPELINE_WON_STAGES, ...PIPELINE_LOST_STAGES] as const;

export function isClosedPipelineStage(stageName: string | null | undefined): boolean {
  if (!stageName) return false;
  const lower = stageName.toLowerCase();
  return (
    PIPELINE_CLOSED_STAGES.some((s) => s.toLowerCase() === lower) ||
    lower.includes('closed won') ||
    lower.includes('closed lost')
  );
}

export function isWonPipelineStage(stageName: string | null | undefined): boolean {
  if (!stageName) return false;
  const lower = stageName.toLowerCase();
  return PIPELINE_WON_STAGES.some((s) => s.toLowerCase() === lower) || lower.includes('closed won');
}

export function isLostPipelineStage(stageName: string | null | undefined): boolean {
  if (!stageName) return false;
  const lower = stageName.toLowerCase();
  return (
    PIPELINE_LOST_STAGES.some((s) => s.toLowerCase() === lower) || lower.includes('closed lost')
  );
}
