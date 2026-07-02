'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AlertTriangle, Loader2, UserMinus, Users } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Button, Dialog } from './ui';
import { cn } from '../lib/utils';

interface WorkSummary {
  contacts: number;
  brands: number;
  deals: number;
  tasks: number;
  calls: number;
  emails: number;
  tickets: number;
  campaigns: number;
  documents: number;
  calendarEvents: number;
  total: number;
}

interface HandoverCandidate {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  kind: 'manager' | 'teammate';
}

type HandoverMode = 'TO_MANAGER' | 'TO_USER' | 'SPLIT';

interface DeactivateUserDialogProps {
  userId: string;
  userName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function WorkBreakdown({ summary }: { summary: WorkSummary }) {
  const rows = [
    ['Contacts', summary.contacts],
    ['Brands', summary.brands],
    ['Deals', summary.deals],
    ['Tasks', summary.tasks],
    ['Calls', summary.calls],
    ['Emails', summary.emails],
    ['Tickets', summary.tickets],
    ['Campaigns', summary.campaigns],
    ['Documents', summary.documents],
    ['Calendar events', summary.calendarEvents],
  ].filter(([, n]) => (n as number) > 0) as Array<[string, number]>;

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No active records owned by this user.</p>;
  }

  return (
    <ul className="text-sm space-y-1">
      {rows.map(([label, count]) => (
        <li key={label} className="flex justify-between text-muted-foreground">
          <span>{label}</span>
          <span className="font-medium text-foreground">{count}</span>
        </li>
      ))}
    </ul>
  );
}

export function DeactivateUserDialog({ userId, userName, open, onClose, onSuccess }: DeactivateUserDialogProps) {
  const [mode, setMode] = useState<HandoverMode>('TO_MANAGER');
  const [singleRecipientId, setSingleRecipientId] = useState('');
  const [splitRecipientIds, setSplitRecipientIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['user-work-summary', userId],
    queryFn: () => apiFetch<{ data: WorkSummary }>(`/users/${userId}/work-summary`),
    enabled: open,
  });

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['handover-candidates', userId],
    queryFn: () =>
      apiFetch<{ data: { manager: HandoverCandidate | null; teammates: HandoverCandidate[] } }>(
        `/users/${userId}/handover-candidates`
      ),
    enabled: open,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => {
      const work = summary?.data;
      const needsHandover = (work?.total ?? 0) > 0;

      let handover: Record<string, unknown> | undefined;
      if (needsHandover) {
        if (mode === 'TO_MANAGER') {
          handover = { mode: 'TO_MANAGER' };
        } else if (mode === 'TO_USER') {
          handover = { mode: 'TO_USER', recipientId: singleRecipientId };
        } else {
          handover = { mode: 'SPLIT', recipientIds: splitRecipientIds };
        }
      }

      return apiFetch(`/users/${userId}/deactivate`, {
        method: 'POST',
        body: JSON.stringify(handover ? { handover } : {}),
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  useEffect(() => {
    if (!open) return;
    setMode('TO_MANAGER');
    setSingleRecipientId('');
    setSplitRecipientIds([]);
    setError('');
  }, [open, userId]);

  useEffect(() => {
    const teammates = candidates?.data?.teammates ?? [];
    if (teammates.length && !singleRecipientId) {
      setSingleRecipientId(teammates[0].id);
    }
  }, [candidates, singleRecipientId]);

  const manager = candidates?.data?.manager ?? null;
  const teammates = candidates?.data?.teammates ?? [];
  const work = summary?.data;
  const needsHandover = (work?.total ?? 0) > 0;
  const loading = summaryLoading || candidatesLoading;

  function toggleSplit(id: string) {
    setSplitRecipientIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function canSubmit() {
    if (loading || deactivateMutation.isPending) return false;
    if (!needsHandover) return true;
    if (mode === 'TO_MANAGER') return !!manager;
    if (mode === 'TO_USER') return !!singleRecipientId;
    return splitRecipientIds.length >= 2 && splitRecipientIds.length <= 3;
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Deactivate ${userName}`}>
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-900 dark:text-amber-100">
            This will deactivate the user and revoke their sessions.
            {needsHandover
              ? ' Choose how to hand over their open work before continuing.'
              : ' They have no active records to reassign.'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {needsHandover && (
              <div className="rounded-xl border border-border/60 p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Work to reassign ({work!.total} items)</p>
                <WorkBreakdown summary={work!} />
              </div>
            )}

            {needsHandover && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Handover to</p>

                <label
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                    mode === 'TO_MANAGER' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  )}
                >
                  <input
                    type="radio"
                    name="handover-mode"
                    className="mt-1"
                    checked={mode === 'TO_MANAGER'}
                    onChange={() => setMode('TO_MANAGER')}
                    disabled={!manager}
                  />
                  <div>
                    <p className="text-sm font-medium">Team manager</p>
                    <p className="text-xs text-muted-foreground">
                      {manager
                        ? `${manager.firstName} ${manager.lastName} (${manager.role}) receives all work`
                        : 'No manager on record — pick another option'}
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                    mode === 'TO_USER' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  )}
                >
                  <input
                    type="radio"
                    name="handover-mode"
                    className="mt-1"
                    checked={mode === 'TO_USER'}
                    onChange={() => setMode('TO_USER')}
                    disabled={teammates.length === 0}
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">One team member</p>
                    <p className="text-xs text-muted-foreground">Assign all records to a single colleague</p>
                    {mode === 'TO_USER' && (
                      <select
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                        value={singleRecipientId}
                        onChange={(e) => setSingleRecipientId(e.target.value)}
                      >
                        {teammates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} ({t.role})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                    mode === 'SPLIT' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  )}
                >
                  <input
                    type="radio"
                    name="handover-mode"
                    className="mt-1"
                    checked={mode === 'SPLIT'}
                    onChange={() => setMode('SPLIT')}
                    disabled={teammates.length < 2}
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> Split across 2–3 team members
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Work is divided evenly (round-robin) between selected colleagues
                    </p>
                    {mode === 'SPLIT' && (
                      <div className="space-y-2">
                        {teammates.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={splitRecipientIds.includes(t.id)}
                              onChange={() => toggleSplit(t.id)}
                            />
                            {t.firstName} {t.lastName} ({t.role})
                          </label>
                        ))}
                        <p className="text-xs text-muted-foreground">
                          Selected: {splitRecipientIds.length} / 3 (minimum 2)
                        </p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            disabled={!canSubmit()}
            onClick={() => deactivateMutation.mutate()}
          >
            {deactivateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserMinus className="w-4 h-4 mr-1.5" /> Deactivate user
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
