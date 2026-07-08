'use client';

import { useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  addContactRole,
  addLineItem,
  cloneOpportunity,
  createActivity,
  deleteOpportunity,
  getOpportunity,
  listActivities,
  listContactRoles,
  listLineItems,
  listStageHistory,
  removeContactRole,
  removeLineItem,
  reopenOpportunity,
  updateActivity,
  updateLineItem,
  updateOpportunity,
} from '@/api/opportunities';
import type { ActivityType, Opportunity } from '@/api/opportunities.types';
import {
  OPPORTUNITY_STAGES,
  STAGE_PROBABILITY,
  SF_PAGE_BG,
  stageIndex,
} from '@/components/opportunity/constants';
import { HighlightsPanel } from '@/components/opportunity/HighlightsPanel';
import { StagePathTracker } from '@/components/opportunity/StagePathTracker';
import { DetailsTab } from '@/components/opportunity/DetailsTab';
import { RelatedTab } from '@/components/opportunity/RelatedTab';
import { StageHistoryList } from '@/components/opportunity/StageHistoryList';
import { ActivityTimeline } from '@/components/opportunity/ActivityTimeline';
import { OpportunityFormDialog } from '@/components/opportunity/OpportunityFormDialog';
import {
  ContactRolesMini,
  FilesWidget,
  KeyFieldsCard,
  RelatedQuickLinksCard,
} from '@/components/opportunity/OpportunitySidebar';
import { showToast } from '@/components/opportunity/toast';
import { cn } from '@/lib/utils';

type TabId = 'related' | 'details' | 'history' | 'news';

export function OpportunityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('related');
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [activityRequest, setActivityRequest] = useState<ActivityType | null>(null);
  const activitySectionRef = useRef<HTMLDivElement>(null);

  const oppKey = ['opportunity', id];

  const { data: opportunity, isLoading, error } = useQuery({
    queryKey: oppKey,
    queryFn: () => getOpportunity(id!),
    enabled: !!id,
  });

  const { data: contactRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['opportunity-contact-roles', id],
    queryFn: () => listContactRoles(id!),
    enabled: !!id,
  });

  const { data: lineItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['opportunity-line-items', id],
    queryFn: () => listLineItems(id!),
    enabled: !!id,
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['opportunity-activities', id],
    queryFn: () => listActivities(id!),
    enabled: !!id,
  });

  const { data: stageHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['opportunity-stage-history', id],
    queryFn: () => listStageHistory(id!),
    enabled: !!id,
  });

  const isClosed = !!opportunity?.isClosed;
  const currentStageIndex = stageIndex(opportunity?.stage ?? '');
  const nextStage =
    currentStageIndex >= 0 && currentStageIndex < OPPORTUNITY_STAGES.length - 1
      ? OPPORTUNITY_STAGES[currentStageIndex + 1]
      : null;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: oppKey });
    queryClient.invalidateQueries({ queryKey: ['opportunity-contact-roles', id] });
    queryClient.invalidateQueries({ queryKey: ['opportunity-line-items', id] });
    queryClient.invalidateQueries({ queryKey: ['opportunity-activities', id] });
    queryClient.invalidateQueries({ queryKey: ['opportunity-stage-history', id] });
    queryClient.invalidateQueries({ queryKey: ['opportunities-index'] });
  };

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateOpportunity>[1]) => updateOpportunity(id!, patch),
    onSuccess: (data) => {
      queryClient.setQueryData(oppKey, data);
      invalidateAll();
      setEditOpen(false);
      setEditError(null);
      setPageError(null);
      showToast('Opportunity updated');
    },
    onError: (err: Error) => {
      setEditError(err.message);
      if (!editOpen) setPageError(err.message);
    },
  });

  const nameMutation = useMutation({
    mutationFn: (name: string) => updateOpportunity(id!, { name }),
    onSuccess: (data) => {
      queryClient.setQueryData(oppKey, data);
      setPageError(null);
    },
    onError: (err: Error) => setPageError(err.message),
  });

  const stageMutation = useMutation({
    mutationFn: ({ stage, lossReason }: { stage: string; lossReason?: string }) =>
      updateOpportunity(id!, {
        stage,
        probability: STAGE_PROBABILITY[stage] ?? opportunity?.probability,
        ...(lossReason ? { lossReason } : {}),
      }),
    onMutate: async ({ stage }) => {
      setPageError(null);
      await queryClient.cancelQueries({ queryKey: oppKey });
      const previous = queryClient.getQueryData<Opportunity>(oppKey);
      if (previous) {
        queryClient.setQueryData<Opportunity>(oppKey, {
          ...previous,
          stage,
          probability: STAGE_PROBABILITY[stage] ?? previous.probability,
          isClosed: stage === 'Closed Won' || stage === 'Closed Lost',
          isWon: stage === 'Closed Won',
        });
      }
      return { previous };
    },
    onSuccess: () => {
      invalidateAll();
      showToast('Stage updated');
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(oppKey, context.previous);
      setPageError(err.message);
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenOpportunity(id!, 'Prospecting'),
    onSuccess: (data) => {
      queryClient.setQueryData(oppKey, data);
      invalidateAll();
      showToast('Opportunity reopened');
    },
    onError: (err: Error) => setPageError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOpportunity(id!),
    onSuccess: () => router.push('/opportunities'),
    onError: (err: Error) => setPageError(err.message),
  });

  const cloneMutation = useMutation({
    mutationFn: () => cloneOpportunity(id!),
    onSuccess: (cloned) => router.push(`/opportunities/${cloned.id}`),
    onError: (err: Error) => setPageError(err.message),
  });

  const addRoleMutation = useMutation({
    mutationFn: (input: Parameters<typeof addContactRole>[1]) => addContactRole(id!, input),
    onSuccess: invalidateAll,
    onError: (err: Error) => setPageError(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: (roleId: string) => removeContactRole(id!, roleId),
    onSuccess: invalidateAll,
    onError: (err: Error) => setPageError(err.message),
  });

  const addItemMutation = useMutation({
    mutationFn: (input: Parameters<typeof addLineItem>[1]) => addLineItem(id!, input),
    onSuccess: invalidateAll,
    onError: (err: Error) => setPageError(err.message),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: Partial<Parameters<typeof updateLineItem>[2]> }) =>
      updateLineItem(id!, itemId, patch),
    onSuccess: invalidateAll,
    onError: (err: Error) => setPageError(err.message),
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => removeLineItem(id!, itemId),
    onSuccess: invalidateAll,
    onError: (err: Error) => setPageError(err.message),
  });

  const activityMutation = useMutation({
    mutationFn: (input: Parameters<typeof createActivity>[1]) => createActivity(id!, input),
    onSuccess: invalidateAll,
    onError: (err: Error) => setPageError(err.message),
  });

  const completeActivityMutation = useMutation({
    mutationFn: (activityId: string) => updateActivity(id!, activityId, { status: 'completed' }),
    onSuccess: invalidateAll,
    onError: (err: Error) => setPageError(err.message),
  });

  const scrollToActivity = useCallback((type: ActivityType) => {
    setActivityRequest(type);
    requestAnimationFrame(() => {
      activitySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const handleQuickActivity = useCallback(() => {}, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ background: SF_PAGE_BG }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#0176D3]" />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="p-8 text-center" style={{ background: SF_PAGE_BG }}>
        <p className="text-red-600">
          {error instanceof Error ? error.message : 'Opportunity not found'}
        </p>
      </div>
    );
  }

  return (
    <div className="opportunity-page min-h-full" style={{ backgroundColor: SF_PAGE_BG }}>
      <div className="px-4 sm:px-6 py-4">
        {pageError && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 flex justify-between gap-2">
            <span>{pageError}</span>
            <button type="button" onClick={() => setPageError(null)} className="text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {isClosed && (
          <div className="mb-3 rounded border border-[#c9c9c9] bg-[#fff] px-4 py-2 text-sm text-[#706e6b]">
            This opportunity is closed and read-only. Use <strong>Reopen Opportunity</strong> to make changes.
          </div>
        )}

        <HighlightsPanel
          opportunity={opportunity}
          readOnly={isClosed}
          savingName={nameMutation.isPending}
          onNameSave={(name) => nameMutation.mutate(name)}
          onEdit={() => {
            setEditError(null);
            setEditOpen(true);
          }}
          onDelete={() => {
            if (window.confirm('Delete this opportunity?')) deleteMutation.mutate();
          }}
          onClone={() => cloneMutation.mutate()}
          onReopen={() => reopenMutation.mutate()}
          onLogCall={() => scrollToActivity('call')}
          onNewTask={() => scrollToActivity('task')}
          onNewEvent={() => scrollToActivity('event')}
        />

        <StagePathTracker
          currentStage={opportunity.stage}
          readOnly={isClosed}
          onStageChange={(stage, lossReason) => stageMutation.mutate({ stage, lossReason })}
          updating={stageMutation.isPending}
        />

        <div className="mt-3 grid grid-cols-1 min-[1000px]:grid-cols-[1fr_1fr] gap-3">
          <div className="rounded border border-[#c9c9c9] bg-white">
            <div className="px-4 py-2 border-b border-[#e5e5e5] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#181818]">Key Fields</h3>
              {!isClosed && nextStage && (
                <button
                  type="button"
                  onClick={() => stageMutation.mutate({ stage: nextStage })}
                  className="rounded bg-[#0176D3] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014486]"
                >
                  Mark Stage as Complete
                </button>
              )}
            </div>
            <dl className="px-4 py-3 text-sm space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <dt className="text-[#706e6b]">Amount</dt>
                <dd className="text-right tabular-nums font-semibold">
                  {opportunity.amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 2,
                  })}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <dt className="text-[#706e6b]">Close Date</dt>
                <dd className="text-right">{new Date(opportunity.closeDate ?? '').toLocaleDateString()}</dd>
              </div>
              {opportunity.lossReason && (
                <div className="grid grid-cols-2 gap-2">
                  <dt className="text-[#706e6b]">Loss Reason</dt>
                  <dd className="text-right">{opportunity.lossReason}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="rounded border border-[#c9c9c9] bg-white">
            <div className="px-4 py-2 border-b border-[#e5e5e5]">
              <h3 className="text-sm font-bold text-[#181818]">Guidance for Success</h3>
            </div>
            <div className="px-4 py-3 text-sm text-[#181818]">
              <p className="font-semibold mb-1">Qualify your opportunity.</p>
              <ul className="list-disc pl-4 text-[#3e3e3c] space-y-1 text-xs">
                <li>Identify the products or services required for this opportunity.</li>
                <li>Confirm your key stakeholders and timeline.</li>
                <li>Capture next step and lead source before advancing stage.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 min-[900px]:flex-row">
          <main className="flex-1 min-w-0 min-[900px]:w-2/3">
            <LightningTabs tab={tab} onTab={setTab} />

            {tab === 'details' && <DetailsTab opportunity={opportunity} />}
            {tab === 'history' && (
              <StageHistoryList entries={stageHistory} loading={historyLoading} />
            )}
            {tab === 'related' && (
              <RelatedTab
                contactRoles={contactRoles}
                lineItems={lineItems}
                currency={opportunity.currency}
                loadingRoles={rolesLoading}
                loadingItems={itemsLoading}
                readOnly={isClosed}
                onAddRole={(input) => addRoleMutation.mutate(input)}
                onRemoveRole={(roleId) => removeRoleMutation.mutate(roleId)}
                onAddItem={(input) => addItemMutation.mutate(input)}
                onUpdateItem={(itemId, patch) => updateItemMutation.mutate({ itemId, patch })}
                onRemoveItem={(itemId) => removeItemMutation.mutate(itemId)}
                savingRole={addRoleMutation.isPending}
                savingItem={addItemMutation.isPending}
                roleError={addRoleMutation.error instanceof Error ? addRoleMutation.error.message : null}
              />
            )}
            {tab === 'news' && (
              <div className="rounded bg-white shadow-[0_2px_2px_rgba(0,0,0,0.05)] border border-[#e5e5e5] p-8 text-center text-sm text-[#706e6b]">
                No news articles linked to this opportunity.
              </div>
            )}

            <ActivityTimeline
              activities={activities}
              loading={activitiesLoading}
              readOnly={isClosed}
              onQuickAction={handleQuickActivity}
              onCreateActivity={(input) => activityMutation.mutate(input)}
              onCompleteActivity={(activityId) => completeActivityMutation.mutate(activityId)}
              creating={activityMutation.isPending}
              completing={completeActivityMutation.isPending}
              quickActionRequest={activityRequest}
              onQuickActionConsumed={() => setActivityRequest(null)}
              sectionRef={activitySectionRef}
            />
          </main>

          <aside className="w-full min-[900px]:w-1/3 shrink-0">
            <RelatedQuickLinksCard
              counts={{
                campaignInfluence: 0,
                contactRoles: contactRoles.length,
                quotes: 0,
                products: lineItems.length,
                notes: 0,
                files: 0,
              }}
            />
            <ContactRolesMini roles={contactRoles} loading={rolesLoading} />
            <KeyFieldsCard opportunity={opportunity} />
            <FilesWidget />
          </aside>
        </div>

        <OpportunityFormDialog
          open={editOpen}
          opportunity={opportunity}
          amountLocked={opportunity.amountLocked || lineItems.length > 0}
          loading={updateMutation.isPending}
          error={editError}
          onClose={() => {
            setEditOpen(false);
            setEditError(null);
          }}
          onSave={(payload) => {
            setEditError(null);
            updateMutation.mutate(payload);
          }}
        />
      </div>
    </div>
  );
}

function LightningTabs({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'related', label: 'Related' },
    { id: 'details', label: 'Details' },
    { id: 'history', label: 'Stage History' },
    { id: 'news', label: 'News' },
  ];
  return (
    <div className="flex border-b border-[#c9c9c9] bg-white rounded-t shadow-[0_2px_2px_rgba(0,0,0,0.05)]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onTab(t.id)}
          className={cn(
            'px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
            tab === t.id
              ? 'border-[#0176D3] text-[#0176D3]'
              : 'border-transparent text-[#706e6b] hover:text-[#181818]'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
