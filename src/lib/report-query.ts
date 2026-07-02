export interface ReportFilters {
  period: string;
  useCustomRange: boolean;
  customStart: string;
  customEnd: string;
  userId: string;
  compare: boolean;
}

export function buildReportSearchParams(filters: ReportFilters): string {
  const p = new URLSearchParams();
  if (filters.useCustomRange && filters.customStart && filters.customEnd) {
    p.set('startDate', filters.customStart);
    p.set('endDate', filters.customEnd);
  } else {
    p.set('period', filters.period);
  }
  if (filters.userId) p.set('userId', filters.userId);
  if (filters.compare) p.set('compare', 'true');
  return p.toString();
}
