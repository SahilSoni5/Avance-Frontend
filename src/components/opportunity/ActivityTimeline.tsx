'use client';

import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { Calendar, Check, ChevronDown, ChevronUp, Loader2, Mail, Phone, Plus } from 'lucide-react';
import type { Activity, ActivityType } from '@/api/opportunities.types';
import { formatOpportunityDateTime } from './utils';
import { LightningCard } from './LightningCard';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
  readOnly?: boolean;
  onQuickAction: (type: ActivityType) => void;
  onCreateActivity: (input: { type: ActivityType; subject: string; notes?: string; dueDate?: string }) => void;
  onCompleteActivity?: (activityId: string) => void;
  creating?: boolean;
  completing?: boolean;
  quickActionRequest?: ActivityType | null;
  onQuickActionConsumed?: () => void;
  sectionRef?: RefObject<HTMLDivElement>;
}

const TYPE_ICONS: Record<ActivityType, typeof Phone> = {
  call: Phone,
  task: Plus,
  event: Calendar,
  email: Mail,
};

function isCompleted(a: Activity) {
  return a.status === 'completed' || !!a.completedAt;
}

export function ActivityTimeline({
  activities,
  loading,
  readOnly,
  onQuickAction,
  onCreateActivity,
  onCompleteActivity,
  creating,
  completing,
  quickActionRequest,
  onQuickActionConsumed,
  sectionRef,
}: ActivityTimelineProps) {
  const [showPast, setShowPast] = useState(true);
  const [formType, setFormType] = useState<ActivityType | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!quickActionRequest || readOnly) return;
    setFormType(quickActionRequest);
    onQuickAction(quickActionRequest);
    onQuickActionConsumed?.();
  }, [quickActionRequest, onQuickAction, onQuickActionConsumed, readOnly]);

  const now = Date.now();
  const openActivities = activities.filter((a) => !isCompleted(a));
  const upcoming = openActivities.filter(
    (a) => a.dueDate && new Date(a.dueDate).getTime() >= now
  );
  const overdue = openActivities.filter(
    (a) => a.dueDate && new Date(a.dueDate).getTime() < now
  );
  const openNoDue = openActivities.filter((a) => !a.dueDate);
  const past = activities.filter((a) => isCompleted(a));

  function openForm(type: ActivityType) {
    if (readOnly) return;
    setFormType(type);
    onQuickAction(type);
  }

  function submitActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!formType || !subject.trim()) return;
    onCreateActivity({
      type: formType,
      subject: subject.trim(),
      notes: description.trim() || undefined,
      dueDate: dueDate || undefined,
    });
    setSubject('');
    setDescription('');
    setDueDate('');
    setFormType(null);
  }

  return (
    <div ref={sectionRef}>
      <LightningCard className="mt-4">
        <div className="px-4 py-3 border-b border-[#e5e5e5] flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#181818]">Activity</h3>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <QuickBtn icon={Phone} label="Log a Call" onClick={() => openForm('call')} />
              <QuickBtn icon={Plus} label="New Task" onClick={() => openForm('task')} />
              <QuickBtn icon={Calendar} label="New Event" onClick={() => openForm('event')} />
              <QuickBtn icon={Mail} label="Email" onClick={() => openForm('email')} />
            </div>
          )}
        </div>

        {formType && !readOnly && (
          <form onSubmit={submitActivity} className="px-4 py-3 bg-[#f3f3f3] border-b border-[#e5e5e5] space-y-2">
            <p className="text-xs font-semibold text-[#0176D3] capitalize">New {formType}</p>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full text-sm border border-[#c9c9c9] rounded px-2 py-1.5"
              required
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              className="w-full text-sm border border-[#c9c9c9] rounded px-2 py-1.5"
            />
            {(formType === 'task' || formType === 'event') && (
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-sm border border-[#c9c9c9] rounded px-2 py-1.5"
              />
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="text-xs px-3 py-1.5 bg-[#0176D3] text-white rounded">
                {creating ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setFormType(null)} className="text-xs px-3 py-1.5 border rounded">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="px-4 py-3">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-[#706e6b] justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading activities…
            </div>
          ) : (
            <>
              <ActivityGroup title="Upcoming & Overdue" count={upcoming.length + overdue.length + openNoDue.length}>
                {overdue.map((a) => (
                  <ActivityRow
                    key={a.id}
                    activity={a}
                    variant="overdue"
                    readOnly={readOnly}
                    completing={completing}
                    onComplete={onCompleteActivity}
                  />
                ))}
                {upcoming.map((a) => (
                  <ActivityRow
                    key={a.id}
                    activity={a}
                    variant="upcoming"
                    readOnly={readOnly}
                    completing={completing}
                    onComplete={onCompleteActivity}
                  />
                ))}
                {openNoDue.map((a) => (
                  <ActivityRow
                    key={a.id}
                    activity={a}
                    variant="upcoming"
                    readOnly={readOnly}
                    completing={completing}
                    onComplete={onCompleteActivity}
                  />
                ))}
                {upcoming.length === 0 && overdue.length === 0 && openNoDue.length === 0 && (
                  <p className="text-sm text-[#706e6b] py-3">No upcoming or overdue activities.</p>
                )}
              </ActivityGroup>

              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                className="flex items-center gap-1 text-sm font-semibold text-[#0176D3] mt-4 mb-2"
              >
                {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Past Activity ({past.length})
              </button>
              {showPast && (
                <div className="space-y-1">
                  {past.length === 0 ? (
                    <p className="text-sm text-[#706e6b] py-3">No past activity.</p>
                  ) : (
                    past.map((a) => <ActivityRow key={a.id} activity={a} variant="past" readOnly />)
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </LightningCard>
    </div>
  );
}

function QuickBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Phone;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs border border-[#c9c9c9] rounded px-2.5 py-1.5 text-[#0176D3] hover:bg-[#f3f3f3]"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function ActivityGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-bold text-[#706e6b] uppercase tracking-wide mb-2">
        {title} ({count})
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ActivityRow({
  activity,
  variant,
  readOnly,
  completing,
  onComplete,
}: {
  activity: Activity;
  variant: 'upcoming' | 'overdue' | 'past';
  readOnly?: boolean;
  completing?: boolean;
  onComplete?: (id: string) => void;
}) {
  const Icon = TYPE_ICONS[activity.type] ?? Phone;
  return (
    <div
      className={cn(
        'flex gap-3 py-2 px-2 rounded border-l-2 text-sm',
        variant === 'overdue' && 'border-l-red-500 bg-red-50/50',
        variant === 'upcoming' && 'border-l-[#0176D3] bg-[#0176D3]/5',
        variant === 'past' && 'border-l-[#c9c9c9]'
      )}
    >
      <Icon className="w-4 h-4 text-[#706e6b] shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-[#181818]">{activity.subject}</p>
          {variant === 'overdue' && (
            <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">
              Overdue
            </span>
          )}
        </div>
        {activity.description && (
          <p className="text-xs text-[#706e6b] mt-0.5 line-clamp-2">{activity.description}</p>
        )}
        <p className="text-xs text-[#706e6b] mt-1">
          {activity.dueDate ? formatOpportunityDateTime(activity.dueDate) : formatOpportunityDateTime(activity.createdAt)}
          {activity.owner && ` · ${activity.owner.firstName} ${activity.owner.lastName}`}
        </p>
      </div>
      {!readOnly && onComplete && variant !== 'past' && (
        <button
          type="button"
          disabled={completing}
          onClick={() => onComplete(activity.id)}
          className="shrink-0 inline-flex items-center gap-1 self-start rounded border border-[#c9c9c9] px-2 py-1 text-[11px] font-semibold text-[#0176D3] hover:bg-[#f3f3f3] disabled:opacity-50"
          title="Mark Completed"
        >
          <Check className="w-3 h-3" />
          Complete
        </button>
      )}
    </div>
  );
}
