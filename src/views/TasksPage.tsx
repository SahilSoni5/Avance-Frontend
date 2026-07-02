'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, CheckCircle2, Circle, Clock, AlertCircle, Calendar, Phone,
  Mail, Video, ClipboardList, Star, Loader2, ChevronDown,
  Users2, User2, Search,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatDateIST } from '../lib/locale';
import { useAuthStore } from '../stores/auth.store';
import { Role } from '@crm/shared';
import { Button, Dialog } from '../components/ui';
import { RecordForm } from '../components/RecordForm';
import { cn } from '../lib/utils';

interface TaskOwner { id: string; firstName: string; lastName: string; role: string }
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string | null;
  dueDate: string | null;
  parentTaskId: string | null;
  assignedTo: TaskOwner;
  assignedBy: { firstName: string; lastName: string } | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  deal?: { id: string; name: string } | null;
  account?: { id: string; name: string } | null;
}

interface ScopedUser { id: string; firstName: string; lastName: string; role: string; email: string }

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const TYPE_ICONS: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  TODO: ClipboardList,
  DEMO: Star,
  FOLLOW_UP: Clock,
};

function isOverdue(task: Task) {
  if (!task.dueDate) return false;
  return new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
}

function isDueToday(task: Task) {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  const today = new Date();
  return due.toDateString() === today.toDateString();
}

function isDueThisWeek(task: Task) {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return due > now && due <= weekEnd;
}

function groupTasks(tasks: Task[]) {
  const groups: Record<string, Task[]> = { Overdue: [], 'Due Today': [], 'This Week': [], Later: [], 'No Due Date': [] };
  for (const task of tasks) {
    if (task.status === 'COMPLETED') continue;
    if (isOverdue(task)) groups.Overdue.push(task);
    else if (isDueToday(task)) groups['Due Today'].push(task);
    else if (isDueThisWeek(task)) groups['This Week'].push(task);
    else if (!task.dueDate) groups['No Due Date'].push(task);
    else groups.Later.push(task);
  }
  return groups;
}

function TaskCard({
  task,
  onComplete,
  completing,
}: {
  task: Task;
  onComplete: (id: string) => void;
  completing: boolean;
}) {
  const TypeIcon = (task.type && TYPE_ICONS[task.type]) ? TYPE_ICONS[task.type] : ClipboardList;
  const isCompleted = task.status === 'COMPLETED';

  return (
    <div className={cn(
      'bg-card border rounded-2xl p-4 transition-all',
      isCompleted ? 'opacity-50 border-border/30' : 'border-border/60 hover:shadow-md hover:-translate-y-0.5',
    )}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => !isCompleted && onComplete(task.id)}
          disabled={completing || isCompleted}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:cursor-default"
        >
          {completing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('font-medium text-sm text-foreground', isCompleted && 'line-through')}>{task.title}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_STYLES[task.priority] ?? 'bg-muted text-muted-foreground')}>
                {task.priority}
              </span>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TypeIcon className="w-3.5 h-3.5" />
              <span>{task.type ?? 'TODO'}</span>
            </div>

            {task.dueDate && (
              <div className={cn('flex items-center gap-1 text-xs font-medium', isOverdue(task) ? 'text-red-500' : 'text-muted-foreground')}>
                <Clock className="w-3.5 h-3.5" />
                {formatDateIST(task.dueDate)}
              </div>
            )}

            {task.contact && (
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {task.contact.firstName} {task.contact.lastName}
              </span>
            )}
            {task.deal && (
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {task.deal.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  onComplete,
  completingId,
  accentClass,
}: {
  title: string;
  tasks: Task[];
  onComplete: (id: string) => void;
  completingId: string | null;
  accentClass?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (tasks.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-2 mb-3 w-full text-left"
      >
        <span className={cn('text-sm font-semibold', accentClass ?? 'text-foreground')}>{title}</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{tasks.length}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground ml-auto transition-transform', collapsed && '-rotate-90')} />
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              completing={completingId === task.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TasksPage() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Team search state
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [selectedTeamUserId, setSelectedTeamUserId] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Intern dropdown (Employee only)
  const [selectedInternId, setSelectedInternId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiFetch<{ data: Task[]; scope: string }>('/tasks?limit=100'),
  });

  const { data: scopedUsersData } = useQuery({
    queryKey: ['scoped-users'],
    queryFn: () => apiFetch<{ data: ScopedUser[] }>('/users?limit=100'),
    enabled: user?.role !== 'INTERN',
  });

  const { data: teamTasksData, isLoading: teamTasksLoading } = useQuery({
    queryKey: ['team-tasks', selectedTeamUserId ?? selectedInternId],
    queryFn: () => apiFetch<{ data: Task[] }>(`/tasks/team?userId=${selectedTeamUserId ?? selectedInternId}`),
    enabled: !!(selectedTeamUserId || selectedInternId),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: body.title,
          description: body.description || undefined,
          assignedToId: user!.id,
          dueDate: body.dueDate || undefined,
          priority: body.priority || 'MEDIUM',
          type: body.type || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setCreateOpen(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      setCompletingId(taskId);
      return apiFetch(`/tasks/${taskId}/complete`, { method: 'POST' });
    },
    onSettled: () => {
      setCompletingId(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['team-tasks'] });
    },
  });

  const myTasks = data?.data?.filter(t => t.status !== 'COMPLETED') ?? [];
  const groups = useMemo(() => groupTasks(myTasks), [myTasks]);

  // Users for team search
  const scopedUsers = scopedUsersData?.data ?? [];
  const filteredUsers = scopedUsers.filter(u =>
    u.id !== user?.id &&
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(teamSearchQuery.toLowerCase())
  );

  // Interns for Employee
  const interns = scopedUsers.filter(u => u.role === 'INTERN');

  const selectedTeamUser = scopedUsers.find(u => u.id === (selectedTeamUserId ?? selectedInternId));
  const teamTaskGroups = useMemo(() => {
    if (!teamTasksData?.data) return {};
    return groupTasks(teamTasksData.data);
  }, [teamTasksData]);

  const totalTasks = myTasks.length;
  const overdueCount = groups.Overdue?.length ?? 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalTasks} open · {overdueCount > 0 && <span className="text-red-500 font-medium">{overdueCount} overdue</span>}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Task
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* My Tasks section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold text-foreground">My Tasks</h2>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="h-16 bg-card border border-border/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : totalTasks === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm mt-1">No open tasks.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <TaskGroup title="Overdue" tasks={groups.Overdue} onComplete={id => completeMutation.mutate(id)} completingId={completingId} accentClass="text-red-500" />
              <TaskGroup title="Due Today" tasks={groups['Due Today']} onComplete={id => completeMutation.mutate(id)} completingId={completingId} accentClass="text-amber-600" />
              <TaskGroup title="This Week" tasks={groups['This Week']} onComplete={id => completeMutation.mutate(id)} completingId={completingId} accentClass="text-indigo-600" />
              <TaskGroup title="Later" tasks={groups.Later} onComplete={id => completeMutation.mutate(id)} completingId={completingId} />
              <TaskGroup title="No Due Date" tasks={groups['No Due Date']} onComplete={id => completeMutation.mutate(id)} completingId={completingId} />
            </div>
          )}
        </div>

        {/* Role-specific bottom sections */}

        {/* BOSS: Search Team Member's Tasks */}
        {user?.role === 'BOSS' && (
          <div className="border-t border-border/40 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Users2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-foreground">Search Team Member's Tasks</h2>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={teamSearchQuery}
                onChange={e => { setTeamSearchQuery(e.target.value); setShowUserDropdown(true); }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Search any team member..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {showUserDropdown && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2"
                      onClick={() => {
                        setSelectedTeamUserId(u.id);
                        setTeamSearchQuery(`${u.firstName} ${u.lastName}`);
                        setShowUserDropdown(false);
                      }}
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <span>{u.firstName} {u.lastName}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{u.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTeamUser && teamTasksData && (
              <TeamTaskSection
                userName={`${selectedTeamUser.firstName} ${selectedTeamUser.lastName}`}
                groups={teamTaskGroups}
                loading={teamTasksLoading}
                onComplete={id => completeMutation.mutate(id)}
                completingId={completingId}
              />
            )}
          </div>
        )}

        {/* MANAGER: My Team's Tasks */}
        {user?.role === 'MANAGER' && (
          <div className="border-t border-border/40 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Users2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-foreground">My Team's Tasks</h2>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={teamSearchQuery}
                onChange={e => { setTeamSearchQuery(e.target.value); setShowUserDropdown(true); }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Search team member..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {showUserDropdown && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 flex items-center gap-2"
                      onClick={() => {
                        setSelectedTeamUserId(u.id);
                        setTeamSearchQuery(`${u.firstName} ${u.lastName}`);
                        setShowUserDropdown(false);
                      }}
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <span>{u.firstName} {u.lastName}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{u.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTeamUser && (
              <TeamTaskSection
                userName={`${selectedTeamUser.firstName} ${selectedTeamUser.lastName}`}
                groups={teamTaskGroups}
                loading={teamTasksLoading}
                onComplete={id => completeMutation.mutate(id)}
                completingId={completingId}
              />
            )}
          </div>
        )}

        {/* EMPLOYEE: My Interns' Tasks */}
        {user?.role === 'EMPLOYEE' && interns.length > 0 && (
          <div className="border-t border-border/40 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center">
                <User2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-foreground">My Interns' Tasks</h2>
            </div>

            <div className="mb-4">
              <select
                value={selectedInternId ?? ''}
                onChange={e => setSelectedInternId(e.target.value || null)}
                className="w-full sm:w-72 px-4 py-2.5 text-sm border border-border/60 rounded-xl bg-card/80 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select an intern...</option>
                {interns.map(intern => (
                  <option key={intern.id} value={intern.id}>
                    {intern.firstName} {intern.lastName}
                  </option>
                ))}
              </select>
            </div>

            {selectedInternId && (
              <TeamTaskSection
                userName={selectedTeamUser ? `${selectedTeamUser.firstName} ${selectedTeamUser.lastName}` : 'Intern'}
                groups={teamTaskGroups}
                loading={teamTasksLoading}
                onComplete={id => completeMutation.mutate(id)}
                completingId={completingId}
              />
            )}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New Task">
        <RecordForm
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'dueDate', label: 'Due Date', type: 'date' },
            {
              name: 'priority', label: 'Priority', type: 'select',
              options: [
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ],
            },
            {
              name: 'type', label: 'Type', type: 'select',
              options: [
                { value: 'TODO', label: 'To-Do' },
                { value: 'CALL', label: 'Call' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'MEETING', label: 'Meeting' },
                { value: 'DEMO', label: 'Demo' },
                { value: 'FOLLOW_UP', label: 'Follow-Up' },
              ],
            },
          ]}
          loading={createMutation.isPending}
          submitLabel="Create Task"
          onSubmit={values => createMutation.mutate(values as unknown as Record<string, string>)}
        />
      </Dialog>
    </div>
  );
}

function TeamTaskSection({
  userName,
  groups,
  loading,
  onComplete,
  completingId,
}: {
  userName: string;
  groups: Record<string, Task[]>;
  loading: boolean;
  onComplete: (id: string) => void;
  completingId: string | null;
}) {
  const totalOpen = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="bg-muted/20 rounded-2xl p-4 border border-border/40">
      <p className="text-sm font-semibold text-foreground mb-3">
        {userName}'s Tasks <span className="text-muted-foreground font-normal">({totalOpen} open)</span>
      </p>
      {loading ? (
        <div className="space-y-2">
          {Array.from({length: 3}).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : totalOpen === 0 ? (
        <p className="text-sm text-muted-foreground italic">No open tasks.</p>
      ) : (
        <div className="space-y-4">
          <TaskGroup title="Overdue" tasks={groups.Overdue ?? []} onComplete={onComplete} completingId={completingId} accentClass="text-red-500" />
          <TaskGroup title="Due Today" tasks={groups['Due Today'] ?? []} onComplete={onComplete} completingId={completingId} accentClass="text-amber-600" />
          <TaskGroup title="This Week" tasks={groups['This Week'] ?? []} onComplete={onComplete} completingId={completingId} accentClass="text-indigo-600" />
          <TaskGroup title="Later" tasks={groups.Later ?? []} onComplete={onComplete} completingId={completingId} />
          <TaskGroup title="No Due Date" tasks={groups['No Due Date'] ?? []} onComplete={onComplete} completingId={completingId} />
        </div>
      )}
    </div>
  );
}
